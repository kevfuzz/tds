# 03 — Contracts (`@rwp2/contracts`) — NORMATIVE

Everything below ships in `libs/contracts`. Types only + zod schemas + the channel map. No runtime dependencies. `export const CONTRACT_VERSION = 1;`

## 1. Identity & context

```ts
export interface CurrentUser {
  id: string;                 // '4471'
  name: string;               // 'Sinéad Kelly'
  initials: string;
  roles: string[];            // coarse: 'csa' | 'compliance' | …
  permissions: string[];      // fine-grained strings, e.g. 'app.customer-records', 'forms.submit'
}

export interface CustomerRef {
  trn: string;                // '3287645T'
  name: string;
  type: 'Individual' | 'Company';
}

export type Theme = 'dark' | 'light';
export type Density = 'compact' | 'comfortable';

export interface WorkbenchContext {
  customer: CustomerRef | null;   // the workbench-level "open customer"
  persona: string;                // active role key
  theme: Theme;
  density: Density;
  locale: string;                 // 'en-IE'
}

/** What one guest is allowed to see. Pushed on load and on every change. */
export interface GuestContext extends WorkbenchContext {
  appId: string;
  tabId: string;
  user: CurrentUser;
  launch: NavigationTarget;       // the target this tab was opened with
}
```

## 2. Navigation

```ts
export interface NavigationTarget {
  appId: string;                       // registry app id, e.g. 'customer-records'
  path: string;                        // app-internal route, e.g. '/bank/3287645T'
  params?: Record<string, string>;
  customer?: CustomerRef;              // sets/overrides workbench customer context
  openMode?: 'reuse' | 'newTab' | 'window';  // default 'reuse'; 'window' reserved (01 §9)
  label?: string;                      // optional tab label override
}
```

**Tab key** (computed in main, `tabKey(t: NavigationTarget): string`): `appId + '::' + normalizedPath + '::' + (customer?.trn ?? '-')`. `openMode:'reuse'` activates an existing tab with the same key; otherwise, if the **active** tab is the same app + same customer, main pushes an in-place `guest:navigate` to it; else a new tab opens. `'newTab'` always opens a new tab.

## 3. Tabs & workbench state

```ts
export interface TabDescriptor {
  id: string;                     // 't' + monotonic counter
  kind: 'guest' | 'shell';        // shell-native screens vs webview guests
  appId: string;                  // for kind:'shell', 'shell'
  key: string;                    // tabKey — reuse identity
  target: NavigationTarget;       // current target (updated by in-place nav)
  label: string; shortLabel: string; icon: string;   // icon: 'pi pi-*'
  customerTrn: string | null;
  dirty: boolean;
  closeable: boolean;
  lastActiveAt: number;           // epoch ms — feeds future SuspensionPolicy
  history: NavigationTarget[]; forward: NavigationTarget[];
}

export interface AppRuntimeInfo {
  manifest: AppManifest;
  origin: string;                 // resolved origin of entryUrl — navigation allowlist
  menuStatus: 'ok' | 'loading' | 'failed';   // per-customer REST fetch status
}

export interface WorkbenchState {
  user: CurrentUser;
  context: WorkbenchContext;
  apps: AppRuntimeInfo[];
  tabs: TabDescriptor[];
  activeTabId: string | null;
  menu: MenuNode[];               // merged sidebar tree for current context
  prefs: Prefs;
  recents: CustomerRef[];         // max 6
  favourites: string[];           // TRNs
}

export interface Prefs {
  theme: Theme; density: Density;
  groupTabsByCustomer: boolean; alwaysOpenNewTab: boolean;
  persona: string;
}
```

State updates to the shell are **patches**: `export type StatePatch = Partial<WorkbenchState>` — main sends only changed top-level slices; the shell mirror merges them.

## 4. Menu contributions

```ts
export interface MenuNode {
  id: string;                     // main namespaces to '<appId>/<id>' on merge
  label: string;
  icon?: string;                  // 'pi pi-*'
  group: 'registrations' | 'profiles' | 'financials' | 'external' | 'forms' | string;
  order?: number;                 // within group; ties → registry order → label
  target?: NavigationTarget;      // leaf nodes navigate; group nodes may omit
  children?: MenuNode[];
  badge?: string;                 // e.g. 'draft'
}

/** GET manifest.menu.customerMenuUrl  (template vars: {trn} {persona})
 *  Headers: cookies of the app session (SSO). Timeout: 2000ms. */
export interface CustomerMenuResponse {
  items: MenuNode[];
  ttlSeconds?: number;            // main may cache per (appId, trn, persona); default 300
}
```

## 5. Manifest & registry

```ts
export interface AppManifest {
  contractVersion: number;        // must be ≤ shell's CONTRACT_VERSION
  id: string;                     // kebab-case, unique in registry
  name: string;                   // 'Customer records'
  version: string;                // app's own semver, informational
  entryUrl: string;               // absolute, or relative to the manifest URL
  icon: string;                   // 'pi pi-*'
  integration: 'sdk' | 'legacy';
  requiredPermissions?: string[]; // user needs ALL, else app is hidden entirely
  session?: { partition: 'shared' | 'isolated' };  // default 'shared' → 'persist:rwp2'
  menu?: {
    static?: MenuNode[];
    customerMenuUrl?: string;     // template with {trn} {persona}
  };
  healthUrl?: string;
}

export interface Registry {
  environment: string;            // 'dev' | 'staging' | 'prod'
  apps: { manifestUrl: string }[];  // order = default menu/app ordering
}
```

Zod schemas (`registrySchema`, `appManifestSchema`, `menuNodeSchema`, `customerMenuResponseSchema`) ship beside the types; main validates every remote payload and drops (and logs) invalid entries rather than failing the boot.

## 6. IPC channel map

One declaration; both preloads and `router.ts` derive from it. Channels are literal string constants.

```ts
/** Renderer → main, request/response (ipcRenderer.invoke). */
export interface Commands {
  // shell + guests
  'wb:navigate':        { in: NavigationTarget;                out: void };
  'wb:openCustomer':    { in: { trn: string };                 out: void };
  'wb:getUser':         { in: void;                            out: CurrentUser };
  // guests only (sender-scoped; tabId/appId come from the sender registry, never the payload)
  'wb:getContext':      { in: void;                            out: GuestContext };
  'wb:setDirty':        { in: { dirty: boolean };              out: void };
  'wb:contributeMenu':  { in: { items: MenuNode[] };           out: void };
  'wb:notify':          { in: { severity: 'info'|'warn'|'error'; summary: string; detail?: string }; out: void };
  'wb:beforeCloseReply':{ in: { requestId: string; allow: boolean }; out: void };
  // shell only
  'wb:getState':        { in: void;                            out: WorkbenchState };
  'wb:activateTab':     { in: { tabId: string };               out: void };
  'wb:closeTab':        { in: { tabId: string };               out: 'closed'|'vetoed' };
  'wb:reorderTabs':     { in: { orderedIds: string[] };        out: void };
  'wb:back' | 'wb:forward': { in: { tabId: string };           out: void };
  'wb:setPref':         { in: Partial<Prefs>;                  out: void };
  'wb:setFavourite':    { in: { trn: string; fav: boolean };   out: void };
  'wb:refreshAppMenu':  { in: { appId: string };               out: void };  // sidebar retry
  'wb:guestEvent':      { in: ContentHostEvent;                out: void };  // shell reports webview lifecycle
}

/** Main → shell (webContents.send). */
export interface ShellPush {
  'wb:stateChanged': StatePatch;
  'wb:toast':        { severity: 'info'|'warn'|'error'; summary: string; detail?: string; appId: string };
  'wb:shortcut':     { id: 'commandCenter' | 'toggleSidebar' };
}

/** Main → one guest, and shell→guest relays (host.postToGuest). */
export interface GuestPush {
  'wb:contextChanged': GuestContext;
  'wb:navigateInPlace': NavigationTarget;   // guest routes internally, then may setDirty(false)
  'wb:beforeClose':     { requestId: string };  // guest must reply via wb:beforeCloseReply within 3s (else close proceeds)
}
export type GuestPushChannel = keyof GuestPush;

export type ContentHostEvent =
  | { tabId: string; type: 'loaded' }
  | { tabId: string; type: 'crashed'; reason: string }
  | { tabId: string; type: 'load-failed'; code: number; url: string }
  | { tabId: string; type: 'title-changed'; title: string };
```

**Sender validation (normative):** main maintains `WebContentsId → {kind:'shell'} | {kind:'guest', appId, tabId}` (registered when the shell window / each webview is created). Every handler resolves the sender from this registry; guest-only channels from unknown or shell senders are rejected; `tabId`/`appId` are **never** trusted from payloads.

## 7. Bridge APIs (what preloads expose)

```ts
/** window.rwp2Host — injected into every guest by guest.preload.ts. */
export interface GuestHostApi {
  readonly apiVersion: number;    // CONTRACT_VERSION
  getUser(): Promise<CurrentUser>;
  getContext(): Promise<GuestContext>;
  onContextChanged(cb: (ctx: GuestContext) => void): () => void;
  onNavigateInPlace(cb: (t: NavigationTarget) => void): () => void;
  navigate(target: NavigationTarget): Promise<void>;
  openCustomer(trn: string): Promise<void>;
  setDirty(dirty: boolean): void;
  contributeMenu(items: MenuNode[]): void;
  notify(n: { severity: 'info'|'warn'|'error'; summary: string; detail?: string }): void;
  /** Register a close guard; return false (or a rejecting promise) to veto. One handler max. */
  onBeforeClose(handler: () => boolean | Promise<boolean>): () => void;
}

/** window.rwp2Shell — injected into the shell by shell.preload.ts. */
export interface ShellHostApi {
  invoke<C extends keyof Commands>(channel: C, payload: Commands[C]['in']): Promise<Commands[C]['out']>;
  on<C extends keyof ShellPush>(channel: C, cb: (p: ShellPush[C]) => void): () => void;
  guestPreloadPath: string;       // absolute path for the <webview preload> attribute
}
```

`@rwp2/sdk` (06) is the ergonomic Angular layer over `GuestHostApi`; apps may also use the raw bridge (e.g. non-Angular apps).

## 8. REST contracts consumed by the platform

| Endpoint | Owner | Contract |
|---|---|---|
| `GET /api/session/current` | central identity service | → `CurrentUser`. Called by main at boot (D6) and optionally by apps themselves. 401 → OS SSO re-auth flow (out of scope v1: show blocking error). |
| `GET registry.json` | central platform config | → `Registry` |
| `GET <app>/rwp2.manifest.json` | each app team | → `AppManifest` |
| `GET manifest.menu.customerMenuUrl` | each app team | → `CustomerMenuResponse` (§4) |

All other REST traffic is app-private: apps call their own Java services directly from their webview origin; the platform never proxies or inspects it.
