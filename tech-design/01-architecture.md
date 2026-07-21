# 01 — Architecture

## 1. Process model

```
┌─────────────────────────────────────────────────────────────────────┐
│ Electron MAIN process                     (apps/desktop, central)   │
│  bootstrap (auth → registry → manifests) · WorkbenchStore (truth)   │
│  IpcRouter (sender-validated) · MenuAggregator · WebviewPolicy      │
│  persistence (state.json) · global shortcuts                        │
└──────────────┬───────────────────────────────┬──────────────────────┘
        typed IPC (shell channel)       typed IPC (guest channels)
┌──────────────▼──────────────────────────────────────────────────────┐
│ SHELL renderer — Angular 21 workbench     (apps/shell, central)     │
│  chrome: menu bar · ⌘K · rail · sidebar · tab strip · status bar    │
│  content area: one <webview> per content tab (ContentHost)          │
│   ┌───────────────┐ ┌───────────────┐ ┌───────────────────────────┐ │
│   │ webview: tab1 │ │ webview: tab2 │ │ webview: tab3 (legacy JSP)│ │
│   │ customer-recs │ │ work-queues   │ │ integration:'legacy'      │ │
│   │ guest preload │ │ guest preload │ │ guest preload (inert API) │ │
│   └───────────────┘ └───────────────┘ └───────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
         each webview = separate renderer process, separate origin,
         loaded from that app's internal web server
```

Three kinds of code, three owners:

| Layer | Owner | Ships as |
|---|---|---|
| Electron main + preloads | central team | the installer |
| Shell renderer | central team | bundled into the installer (optionally remote-loaded later; same contract) |
| Content apps | domain teams | deployed to internal web servers, loaded by URL at runtime |

**Nothing crosses a boundary except the contracts** in `@rwp2/contracts` (03). The shell never imports app code; apps never import shell code; both sides may only exchange the declared IPC payloads.

## 2. Embedding decision — `<webview>` behind `ContentHost` (D1)

Candidates:

| Mechanism | Layering | Isolation | Control |
|---|---|---|---|
| `<webview>` | **DOM element — shell overlays (menus, ⌘K, dialogs, floating windows) render above it correctly** | own renderer process, own origin | preload injectable, lifecycle events, per-view session |
| `WebContentsView` | native view attached to the window — **always paints above the DOM**; every overlay needs manual bounds-cutting/hiding | same | managed from main; bounds must be synced from renderer layout on every scroll/resize |
| `<iframe>` | DOM element | same-process site isolation only; no preload — bridge must be postMessage, weaker guarantees | limited crash containment |

Your instinct is correct: `<webview>`'s in-page compositing is exactly what a workbench full of overlays needs, and it removes the entire bounds-synchronization problem that `WebContentsView` creates. Its known costs — Electron marks the tag as less actively evolved, and each webview is a full renderer process — are acceptable and mitigated by:

**The `ContentHost` abstraction (normative).** No code outside `apps/shell/src/app/content/` may touch a webview element, and no code outside `apps/desktop/src/` may touch WebContents. The shell defines:

```ts
interface ContentHost {
  readonly tabId: string;
  load(url: string): void;
  show(): void; hide(): void;            // visibility, not destruction
  postToGuest<C extends GuestPushChannel>(channel: C, payload: GuestPush[C]): void;
  reload(): void; destroy(): void;
  readonly events$: Observable<ContentHostEvent>; // loaded | crashed | failed | title-changed
}
```

`WebviewContentHost` is the v1 implementation. If `<webview>` ever has to go, a `WebContentsViewContentHost` (main-process proxy + bounds sync) implements the same interface — **guests are unaffected either way because they only ever see `window.rwp2Host`**, which is delivered by the guest preload, not by the host mechanism.

`ContentHostEvent`, `GuestPush*` types live in `@rwp2/contracts` (03 §6).

## 3. Tabs and instances — one webview per tab (D2)

- Every **content tab** owns exactly one webview for its lifetime. Two tabs on the same app = two independent guest instances (two customers side by side "just works").
- Inactive tabs are hidden (`visibility:hidden`), **not** unloaded — guest state (scroll, form input) survives tab switches.
- Tab identity (`TabKey`, 03 §3) decides reuse: navigating to a target whose key matches an open tab **activates** it; the shell may also push an in-place navigation to the *active* tab's guest when the target is the same app + same customer (the guest handles it with its own Angular router — no reload).
- **Crash containment:** `render-process-gone` on one webview shows a crash card in that tab only (05 §5); shell and siblings are untouched.
- **Memory ceiling (designed-in, not built in v1):** the state model already tracks per-tab `lastActiveAt`; a later `SuspensionPolicy` in main may destroy the webview of tabs inactive > N minutes beyond a count cap, keeping the tab in the strip and reloading on activation. No contract change needed — this is why lifecycle lives behind `ContentHost`.

Shell-native screens (the sidebar, ⌘K, preferences, the "My work" queue if the central team owns it) are ordinary Angular components in the shell — **not every tab is a webview**. A tab's `TabDescriptor.kind` is `'guest' | 'shell'`.

## 4. State ownership — main process is the truth (D3)

All durable/coordinating state lives in a single `WorkbenchStore` in main (04 §3):

- **Identity & context:** `CurrentUser`, active customer, persona, theme, density.
- **Tabs:** descriptors, order, active id, per-tab history, dirty flags, `lastActiveAt`.
- **Menu:** merged sidebar tree + per-source contributions.
- **Prefs, recents, favourites, saved searches.**

Flow is strictly unidirectional:

```
renderer (shell or guest) ──command (ipcRenderer.invoke)──▶ IpcRouter ──▶ reducer ──▶ new state
                                                                             │
   shell ◀── 'wb:stateChanged' patch ────────────────────────────────────────┤
   guests ◀── 'wb:contextChanged' / 'wb:beforeClose' (scoped pushes) ────────┘
```

- Renderers hold **read-only mirrors** (shell mirrors the whole state into signals; each guest receives only its scoped `GuestContext`).
- Guests never see other guests' state; main scopes every push.
- Persistence (04 §7) serializes the durable slice; a shell reload or crash rehydrates from main, not from localStorage.

## 5. App discovery — registry + manifest (D4)

- Environment config gives main one URL: `RWP2_REGISTRY_URL` → `registry.json` (03 §7) listing app manifest URLs.
- Main fetches each `rwp2.manifest.json`, validates (zod schema in `@rwp2/contracts`), filters by the user's permissions, and the result becomes `state.apps`.
- Apps deploy independently; a new app version is picked up on next workbench start (or registry refresh command). The manifest carries `contractVersion` — main refuses (and reports) manifests requiring a newer contract than the installed shell supports.

## 6. Sidebar menu aggregation (D5)

Three contribution sources, merged by `MenuAggregator` in main (04 §5):

1. **Static** — `manifest.menu.static`: instant, available even if the app's server is down.
2. **Per-customer REST** — `manifest.menu.customerMenuUrl` (template: `…/api/workbench/menu?trn={trn}&persona={persona}`). On customer open/switch, main calls every app's endpoint **in parallel, 2s timeout, per-app failure isolation**; a failing app contributes its static items only and the sidebar shows a quiet per-app retry affordance.
3. **Live IPC** — a *running* guest calls `rwp2Host.contributeMenu(items)` (e.g. "Open forms" nodes for its drafts). Scoped to that app; cleared when its last tab closes.

Merge: group → app order (registry order) → `order` field; ids are namespaced `appId/…` by main, so apps cannot collide or spoof each other.

## 7. Auth (D6)

1. Main opens the window; shell shows a splash band.
2. Main calls `GET /api/session/current` (through the app's Electron session, so Kerberos/SSO cookies apply) → `CurrentUser { id, name, roles, permissions }`. Retry with backoff; a hard failure shows a blocking error screen.
3. Only then: registry + manifests → permission-filtered app list → shell chrome renders → tab restore.
4. Guests get the user synchronously-after-load via `rwp2Host.getUser()` (served from main's cache — no network).
5. Apps with their own security **also** call the same endpoint from their own origin; the webview session inherits the OS SSO, so both paths agree. Nothing in the contract prevents an app from doing its own authorization on top.

## 8. Legacy JSP apps (D8)

A legacy app is a manifest with `integration: 'legacy'`: same webview, same preload (the bridge is installed but the app never calls it), static menu items only, no dirty tracking (tabs always close silently), no in-place navigation (every target is a fresh URL load). The shell renders it identically. Migrating a legacy app to `sdk` integration is a manifest flag flip plus adopting `@rwp2/sdk` inside the app.

## 9. Non-goals (v1)

- No shell-remote-loading (shell ships in the installer).
- No native multi-window detach of guest tabs (contract reserves `openMode:'window'`; implementation later).
- No offline mode for content apps.
- No inter-guest direct messaging — anything cross-app goes through main as a navigation or (future) a declared event contract.
