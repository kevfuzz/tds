# 04 — Electron main process (`apps/desktop`)

Main is deliberately small: bootstrap, state, IPC routing, menu aggregation, security policy. No business logic, no UI knowledge beyond the state model.

## 1. Composition root (`src/main/index.ts`)

```ts
app.whenReady().then(async () => {
  const config = loadConfig();                        // env + defaults
  const win = createMainWindow(config);               // shows shell splash immediately
  installWebviewPolicy(win, () => store.state.apps);  // §6 — BEFORE any webview can attach
  installShortcuts(win);                              // §8

  const store = new WorkbenchStore(loadPersistedSlice());
  const senders = new SenderRegistry();
  senders.registerShell(win.webContents.id);
  createIpcRouter({ store, senders, aggregator });    // §4

  const user = await fetchCurrentUser(config);        // §2 — blocking, with retry
  const apps = await loadRegistry(config, user);      // §2
  store.dispatch({ type: 'boot', user, apps });       // shell leaves splash on this patch
});
```

## 2. Bootstrap: auth → registry (`bootstrap/`)

```ts
// session.ts
export async function fetchCurrentUser(cfg: Config): Promise<CurrentUser> {
  // net.fetch goes through the Electron session → OS SSO / Kerberos / cookies apply
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await net.fetch(cfg.sessionUrl, { credentials: 'include' });
      if (!res.ok) throw new Error(`session ${res.status}`);
      return currentUserSchema.parse(await res.json());
    } catch (e) {
      if (attempt >= 4) { showFatalAuthError(e); throw e; }
      await delay(500 * 2 ** attempt);
    }
  }
}
```

`loadRegistry` fetches `registry.json`, then all manifests in parallel; each is zod-validated, checked `contractVersion <= CONTRACT_VERSION`, permission-filtered (`requiredPermissions ⊆ user.permissions`), and resolved to an `AppRuntimeInfo` (absolute `entryUrl`, computed `origin`). Invalid/unreachable manifests are logged and dropped — **one bad app never blocks boot**.

## 3. State (`state/`)

`WorkbenchStore` is a ~60-line class: current `WorkbenchState`, `dispatch(action)` applying **pure reducers**, listener set. Reducers are plain `(state, action) → state` functions with unit tests and no Electron imports — the same discipline as the prototype's tab engine.

Key reducer behaviors:

- `tabs.reducer.ts` — `openTarget` implements the decision order: reuse-by-key → in-place (same app + same customer + active tab + `openMode!=='newTab'` + `!prefs.alwaysOpenNewTab`) → append. In-place pushes the old target onto `history`, clears `forward`. `closeTab` activates the left neighbour. `activateTab` stamps `lastActiveAt`.
- `context.reducer.ts` — `openCustomer` sets `context.customer`, updates `recents` (max 6), and flags menu as `loading` per app.
- `menu.reducer.ts` — merges the three sources (01 §6), namespaces ids, sorts.
- `prefs.reducer.ts` — merge + validate.

**Publishing:** after every dispatch, main computes changed top-level slices → `wb:stateChanged` patch to the shell; if `context` or `user` changed, `wb:contextChanged` (a scoped `GuestContext` from `selectors.guestContext(tabId)`) to **every guest**.

**In-place navigation side effect:** when the tabs reducer resolves a navigation to `in-place` on a guest tab, main also emits `guestPush(tabId, 'wb:navigateInPlace', target)` — the shell relays it into that webview via `ContentHost.postToGuest`.

## 4. IPC router (`ipc/router.ts`, `ipc/senders.ts`)

```ts
export function createIpcRouter(deps: Deps) {
  handle('wb:navigate', (sender, target) => handlers.navigate(deps, sender, target));
  handle('wb:setDirty', (sender, p) => {
    const g = deps.senders.requireGuest(sender);        // throws for shell/unknown senders
    deps.store.dispatch({ type: 'setDirty', tabId: g.tabId, dirty: p.dirty });
  });
  // …one line per channel in Commands; payloads zod-validated where remote-influenced
}
function handle<C extends keyof Commands>(c: C, fn: (senderId: number, p: Commands[C]['in']) => Commands[C]['out'] | Promise<…>) {
  ipcMain.handle(c, (e, p) => fn(e.sender.id, p));
}
```

`SenderRegistry` (03 §6): the shell registers each webview's `webContents.id → {appId, tabId}` right after `did-attach` (via `wb:guestEvent` carrying the id from `webview.getWebContentsId()`), and unregisters on destroy. Until registered, a webContents can invoke nothing.

**Close-with-guard flow** (`wb:closeTab` on a dirty sdk-integrated tab):
1. main sends `wb:beforeClose {requestId}` to the guest (via shell relay), starts a 3s timer;
2. guest's `onBeforeClose` handler runs (its own confirm dialog), replies `wb:beforeCloseReply {requestId, allow}`;
3. allow/timeout → reducer removes the tab, shell destroys the host; deny → `'vetoed'` returned to the shell (tab stays, gets focus).
Legacy tabs and non-dirty tabs skip straight to close.

## 5. Menu aggregation (`menu/`)

```ts
// customer-menu.client.ts
export async function fetchCustomerMenus(apps: AppRuntimeInfo[], trn: string, persona: string) {
  return Promise.all(apps.map(async (a): Promise<AppMenuResult> => {
    const url = a.manifest.menu?.customerMenuUrl;
    if (!url) return { appId: a.manifest.id, status: 'ok', items: [] };
    const cached = cache.get(a.manifest.id, trn, persona);
    if (cached) return cached;
    try {
      const res = await net.fetch(fill(url, { trn, persona }), { signal: AbortSignal.timeout(2000) });
      const body = customerMenuResponseSchema.parse(await res.json());
      return cache.put({ appId: a.manifest.id, status: 'ok', items: body.items }, body.ttlSeconds ?? 300);
    } catch {
      return { appId: a.manifest.id, status: 'failed', items: [] };   // isolation: static items still shown
    }
  }));
}
```

`aggregator.ts` combines, per app: `manifest.menu.static` ∪ REST items ∪ live IPC contributions (kept in a `Map<appId, MenuNode[]>`, cleared when the app's last tab closes) → namespaced, grouped, ordered → `dispatch({type:'menuResolved', results})`. `wb:refreshAppMenu` busts that app's cache entry and refetches (sidebar retry affordance).

## 6. Webview security policy (`windows/webview-policy.ts`)

```ts
export function installWebviewPolicy(win: BrowserWindow, apps: () => AppRuntimeInfo[]) {
  win.webContents.on('will-attach-webview', (e, prefs, params) => {
    prefs.preload = GUEST_PRELOAD_PATH;               // force ours, whatever the DOM said
    prefs.nodeIntegration = false;
    prefs.contextIsolation = true;
    delete (prefs as any).preloadURL;
    if (!apps().some(a => params.src.startsWith(a.origin))) e.preventDefault();  // allowlist
  });
  win.webContents.on('did-attach-webview', (_e, wc) => {
    wc.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
    wc.on('will-navigate', (e, url) => {              // guests stay on their own origin
      if (!apps().some(a => url.startsWith(a.origin))) e.preventDefault();
    });
  });
}
```

- Shell window: `webviewTag: true`, `contextIsolation: true`, `nodeIntegration: false`, `sandbox: false` only if the preload needs it (prefer true), CSP meta in shell `index.html`.
- Sessions: default partition `persist:rwp2` (shared SSO cookies); `session.partition:'isolated'` in a manifest → `persist:rwp2-app-<id>`.
- `guest.preload.ts` exposes **only** `GuestHostApi` via `contextBridge.exposeInMainWorld('rwp2Host', …)`; every method maps 1:1 to a channel in 03 §6, no generic `invoke` escape hatch for guests.

## 7. Persistence (`state/persistence.ts`)

Durable slice = `{ prefs, recents, favourites, tabs: tabs.map(toRestorableTarget), activeTabKey }` → debounced (500ms) atomic write to `app.getPath('userData')/state.json`. On boot, restore after registry load; drop tabs whose `appId` no longer exists or is no longer permitted (FR-172-equivalent: unknown state falls back silently). Corrupt file → start clean, log.

## 8. Shortcuts (`shortcuts.ts`)

⌘K/⌘B must work while focus is inside a guest webview: on `did-attach-webview`, subscribe `wc.on('before-input-event')`, match the two accelerators, `event.preventDefault()`, and send `wb:shortcut` to the shell. Same handler on the shell's own webContents. No `globalShortcut` (would capture system-wide).

## 9. Testing

- Reducers + aggregator + tab-key: Vitest, pure, exhaustive (reuse, in-place, newTab, dirty veto, LRU stamps, menu merge/namespacing/failure isolation, cache TTL).
- Router: unit test sender validation (guest channel from shell sender rejects; unregistered sender rejects).
- Bootstrap: mock `net.fetch`; invalid manifest dropped, boot proceeds; auth retry/backoff.
