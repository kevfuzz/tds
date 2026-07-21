# 06 — Building a content app

Audience: the ~10 domain teams. A content app is an **ordinary Angular 21 app** — own repo or in the monorepo, own router, own PrimeNG/Tailwind usage, own Java backends — plus three platform touchpoints: a **manifest**, the **SDK**, and a **deploy URL** in the registry. `apps/content-customer-records` in the monorepo is the reference implementation; `nx g @rwp2/plugin:content-app` scaffolds a new one.

## 1. Manifest (`public/rwp2.manifest.json`)

```json
{
  "contractVersion": 1,
  "id": "customer-records",
  "name": "Customer records",
  "version": "1.8.0",
  "entryUrl": "./",
  "icon": "pi pi-id-card",
  "integration": "sdk",
  "requiredPermissions": ["app.customer-records"],
  "menu": {
    "static": [
      { "id": "overview", "label": "Overview", "icon": "pi pi-user", "group": "registrations",
        "order": 0, "target": { "appId": "customer-records", "path": "/overview" } }
    ],
    "customerMenuUrl": "/api/customer-records/workbench/menu?trn={trn}&persona={persona}"
  },
  "healthUrl": "/actuator/health"
}
```

The `customerMenuUrl` endpoint is implemented by the team's **Java backend** (03 §4): given user session + trn + persona, return the `MenuNode[]` relevant to that customer — e.g. only show "Properties" if the customer has LPT registrations. Keep it fast (<500ms) and cacheable; the shell times out at 2s and falls back to your static items.

## 2. SDK wiring (`@rwp2/sdk`)

```ts
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withHashLocation()),        // hash routing — the shell launches you at entryUrl#/path
    provideWorkbench(),                               // detects window.rwp2Host; falls back to standalone mode
    providePrimeNG({ theme: rwp2AuraPreset }),        // from @rwp2/ui — matches shell theming
  ],
};
```

`provideWorkbench()` gives you one injectable:

```ts
@Injectable() export class Workbench {
  readonly user: Signal<CurrentUser>;
  readonly context: Signal<GuestContext>;        // customer, persona, theme, density — updates live
  readonly embedded: boolean;                    // false when running standalone (dev)
  navigate(target: NavigationTarget): Promise<void>;   // ask the shell to open a screen (any app)
  openCustomer(trn: string): Promise<void>;
  setDirty(dirty: boolean): void;
  contributeMenu(items: MenuNode[]): void;
  notify(n: { severity: 'info'|'warn'|'error'; summary: string; detail?: string }): void;
  registerCloseGuard(fn: () => boolean | Promise<boolean>): () => void;
}
```

Under the hood it binds `GuestHostApi`, mirrors context into signals, and subscribes `onNavigateInPlace` → `Router.navigateByUrl` (so shell-driven navigation reuses your routes without a reload). It also applies `context.theme`/`density` classes to `document.documentElement` so your PrimeNG theme follows the shell automatically.

**Rules of engagement**

- Call `setDirty(true)` when the user has unsaved input, `setDirty(false)` on save/discard — this drives the tab's ● dot and close guarding. Pair it with `registerCloseGuard` to show your own confirm dialog.
- To open a screen in **another** app, `navigate({ appId: 'forms', path: '/vat3', customer })` — never link to another app's URL directly; only the shell knows where apps live and how tabs reuse.
- `contributeMenu` is for items only a running instance knows (open drafts, in-progress work). Everything predictable belongs in the manifest or your menu endpoint.
- Never read `window.rwp2Host` directly in app code — always the SDK, so standalone mode and tests keep working.

## 3. Standalone dev mode

`ng serve` your app alone (no Electron, no shell): `provideWorkbench()` finds no bridge and installs the `MockHost` from `@rwp2/sdk-testing` — a fake user, a fixture customer, context switching via a small floating dev widget, `navigate()` logged to console. Configurable:

```ts
provideWorkbench({ standalone: { user: FIXTURE_USER, context: { customer: FIXTURE_CUSTOMER, persona: 'csa', theme: 'dark', density: 'compact', locale: 'en-IE' } } })
```

Teams therefore develop and unit-test with zero platform infrastructure; full integration is exercised by running the shell with `registry.dev.json` pointing at their dev server.

## 4. proxy.conf.js (per app — required)

All REST calls in dev go through the app's own origin and are proxied to the Java services — no CORS, and prod-identical relative URLs:

```js
// apps/content-customer-records/proxy.conf.js
module.exports = {
  '/api/customer-records': { target: 'http://localhost:8081', changeOrigin: true, logLevel: 'debug' },
  '/api/session':          { target: 'http://localhost:8080', changeOrigin: true },  // shared identity service
};
```

`project.json` serve target references it (`"proxyConfig": "apps/content-customer-records/proxy.conf.js"`). In production the same relative paths are routed by the app's web server / gateway. **App code never hardcodes service hosts.**

## 5. Apps with their own security

If your app enforces its own authorization: call `GET /api/session/current` yourself (same relative path; the webview session carries the SSO credentials) and gate routes on it. The SDK `user` signal and your own fetch return the same identity — use whichever fits; both are valid per D6. Apps must still declare `requiredPermissions` so the shell can hide them from unauthorized users entirely (defence in depth, not the only gate).

## 6. Legacy JSP apps

Manifest with `integration: "legacy"`, `entryUrl` pointing at the JSP context root, `menu.static` only (optionally a `customerMenuUrl` if the legacy backend can serve one — that works without any frontend change). Behavior differences, all handled by the platform:

- No dirty tracking → tab closes without guard.
- No in-place navigation → each menu target with a different path opens as a URL load (`target.path` appended to `entryUrl`).
- Customer context is passed only via the launch URL (`?trn=…` appended by the shell when `target.customer` is set) — the JSP reads request params as it always has.
- Theme stays whatever the JSP renders (no theming contract).

This makes JSP "just another webview embedding," and gives each legacy app a measured migration path: flip to `integration: 'sdk'` when it adopts the SDK.

## 7. Team checklist (definition of done for onboarding an app)

1. Manifest served at `<app>/rwp2.manifest.json`, zod-valid, `contractVersion` current.
2. Registered in the environment `registry.json`.
3. Hash routing; app boots correctly at `entryUrl#/<any declared menu path>`.
4. `customerMenuUrl` endpoint: <500ms p95, correct per persona/permissions, returns `[]` (not an error) when nothing applies.
5. `setDirty` + close guard wired on every editable screen.
6. Works standalone (`ng serve`) with MockHost; works embedded against the dev shell.
7. No hardcoded hosts; all REST relative + proxied in dev.
8. `@rwp2/*` versions pinned; app builds against the same major as the shell.
