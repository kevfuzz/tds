# 02 — Nx workspace

One Nx monorepo, `rwp2/`. It hosts the desktop app, the shell, the shared libs, and the content apps of teams that opt in. Teams that keep their own repos consume the **publishable** libs from the internal npm registry — same artifacts, same versions (D7).

## 1. Layout

```
rwp2/
  nx.json  package.json  tsconfig.base.json  eslint.config.mjs  .npmrc
  apps/
    desktop/                      # Electron main + preloads (esbuild via @nx/esbuild)
      project.json
      src/
        main/
          index.ts                # composition root ONLY: wire modules, ~60 lines
          config.ts               # env: RWP2_REGISTRY_URL, RWP2_SESSION_URL, dev flags
          bootstrap/
            session.ts            # fetch CurrentUser (retry/backoff)
            registry.ts           # fetch registry.json + manifests, zod-validate, permission-filter
          state/
            store.ts              # WorkbenchStore: state + dispatch + subscribe
            reducers/
              tabs.reducer.ts     # open/close/activate/reorder/history — pure functions
              context.reducer.ts  # customer, persona, theme, density
              menu.reducer.ts     # contribution merge
              prefs.reducer.ts
            selectors.ts          # scoped views: shellState(), guestContext(tabId)
            persistence.ts        # debounced write of durable slice → userData/state.json
          ipc/
            router.ts             # registers every channel from @rwp2/contracts; ONLY ipcMain call site
            senders.ts            # WebContentsId → {kind:'shell'|'guest', appId, tabId} registry
            handlers/
              navigation.handler.ts
              tabs.handler.ts
              guest.handler.ts    # setDirty, contributeMenu, notify, beforeClose replies
              prefs.handler.ts
          menu/
            aggregator.ts         # static + REST + IPC merge (01 §6)
            customer-menu.client.ts # parallel fetch, 2s timeout, failure isolation
          windows/
            main-window.ts        # BrowserWindow creation, CSP, webviewTag:true
            webview-policy.ts     # will-attach-webview guard: preload path + URL allowlist
          shortcuts.ts            # ⌘K/⌘B relay (before-input-event on all WebContents)
        preload/
          shell.preload.ts        # contextBridge: full command surface for the shell
          guest.preload.ts        # contextBridge: window.rwp2Host (GuestHostApi) ONLY
    shell/                        # Angular 21 + PrimeNG 21 + Tailwind 4
      project.json  proxy.conf.js
      src/
        main.ts  index.html  styles.css
        app/
          app.config.ts           # providePrimeNG(Aura/Emerald), provideWorkbenchShell()
          app.component.ts        # fixed bands: menu bar / content row / status bar
          state/
            workbench.store.ts    # signal mirror of main state (subscribes to wb:stateChanged)
          services/
            host.service.ts       # ONLY window.rwp2Shell call site (typed by contracts)
            navigation.service.ts # openTarget/openCustomer/closeTab — components call THIS
          chrome/
            menu-bar/  command-center/  activity-rail/
            sidebar/              # explorer-menu-tree/ + panels; renders MenuNode[]
            tab-strip/  status-bar/  splash/
          content/
            content-area.component.ts   # tab → host mapping, visibility switching
            content-host.ts             # ContentHost interface (01 §2)
            webview-content-host.ts     # v1 impl — the ONLY file with <webview>
            crash-card.component.ts
          screens/                # shell-native screens (kind:'shell'), lazy-loaded
    content-customer-records/     # REFERENCE content app — the template teams copy
      project.json  proxy.conf.js
      public/rwp2.manifest.json
      src/app/ …                  # ordinary Angular app using @rwp2/sdk; own Router
    content-work-queues/
    content-forms/
  libs/
    contracts/                    # @rwp2/contracts   publishable · types + zod schemas + channel map · ZERO deps
    sdk/                          # @rwp2/sdk         publishable · Angular: provideWorkbench(), WorkbenchClient
    sdk-testing/                  # @rwp2/sdk-testing publishable · MockHost for tests/standalone dev
    ui/                           # @rwp2/ui          publishable · tokens.css, tailwind preset, PrimeNG Aura preset, shared dumb components
  tools/
    registry/registry.dev.json    # localhost ports for `nx run-many serve`
    scripts/
```

## 2. Publishable libs (external-repo teams)

| Package | Contents | Rules |
|---|---|---|
| `@rwp2/contracts` | Every type in 03, zod schemas, `IPC` channel map, `CONTRACT_VERSION` | No runtime deps, no Angular. Semver: breaking payload change = major. |
| `@rwp2/sdk` | `provideWorkbench()`, `WorkbenchClient` (signals over the bridge), `HostMenuContributor`, `DirtyGuard`, standalone-mode fallback | Depends only on `@rwp2/contracts` + Angular 21 peer |
| `@rwp2/sdk-testing` | `MockHost` implementing `GuestHostApi` in-page; fixtures | Used by unit tests and `standalone` dev mode |
| `@rwp2/ui` | `tokens.css` (the `--p-*` semantic tokens, dark + `.light`), Tailwind v4 preset mapping utilities to tokens, PrimeNG preset (`definePreset(Aura,{primary: emerald})`), a small set of dumb components (Tag, KeyValueCard, EmptyState) | Optional for apps; mandatory for shell |

Publishing: Nx release (`nx release --projects=contracts,sdk,sdk-testing,ui`) → internal npm registry (`.npmrc` scoped `@rwp2:registry=…`). Versions move in lockstep (single version group) so `@rwp2/sdk@1.4.x` always pairs with `@rwp2/contracts@1.4.x`. External teams pin a minor and upgrade deliberately; `CONTRACT_VERSION` in the manifest lets the shell detect stale apps (01 §5).

## 3. Module boundaries (enforced, not advisory)

Tags in each `project.json`; `@nx/enforce-module-boundaries` in `eslint.config.mjs`:

| Tag | May import |
|---|---|
| `scope:contracts` | (nothing) |
| `scope:sdk` | `scope:contracts` |
| `scope:ui` | `scope:contracts` |
| `scope:shell` | `scope:contracts`, `scope:ui` |
| `scope:desktop` | `scope:contracts` |
| `scope:content` | `scope:contracts`, `scope:sdk`, `scope:sdk-testing`, `scope:ui` |

Consequences: content apps can never import shell code or each other; desktop never imports Angular; the only shared surface is the published libs — identical to what external-repo teams get, so in-repo apps have **zero privileged access**.

## 4. Structure & maintainability guardrails

- **File budget:** warn at 200 lines, error at 300 (`max-lines` ESLint rule; generated files excluded). A file that grows past it gets split by responsibility, not by line count.
- **One purpose per file** — the layout above is normative: reducers are pure and separate from the store; IPC handlers are one file per domain; `router.ts` is the only `ipcMain` call site; `webview-content-host.ts` is the only `<webview>` call site; `host.service.ts` is the only bridge call site in the shell.
- Components: standalone, `ChangeDetectionStrategy.OnPush`, signals; no NgModules; template + component ≤ 200 lines combined or split into child components.
- No cross-cutting `utils.ts` dumping grounds — helpers live next to their single consumer until a second consumer exists, then move to the narrowest shared lib.
- New content app = `nx g @rwp2/plugin:content-app` (a workspace generator under `tools/`) producing the reference-app skeleton: manifest, proxy.conf.js, SDK wiring, one routed screen, one test.

## 5. Toolchain

- Angular 21 / PrimeNG 21 / Tailwind v4 / TypeScript strict.
- Unit tests: Vitest (`@nx/vite`); reducers, aggregator, tab-key logic MUST be covered (pure functions, no TestBed).
- E2E: Playwright against the shell with `MockHost`-backed fake guests; one Electron smoke test (launch, auth stub, open tab) via Playwright's Electron driver.
- `nx affected` in CI — a content-app change never rebuilds the shell.
