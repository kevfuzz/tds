# 07 — Development, build & release

## 1. Local dev topologies

**A — content-app team, app only (most common):**
```
nx serve customer-records        # :4201, proxy.conf.js → local/remote Java services
```
Standalone mode (06 §3): no shell, no Electron. Fastest loop.

**B — full workbench, everything local:**
```
nx run-many -t serve --projects=shell,customer-records,work-queues,forms   # :4200, :4201…
RWP2_REGISTRY_URL=http://localhost:4200/registry/registry.dev.json nx serve desktop
```
`desktop` serve target: esbuild-watch main+preloads, then launch Electron with `ELECTRON_START_URL=http://localhost:4200`. `tools/registry/registry.dev.json` lists the localhost manifest URLs. Hot reload: Angular apps HMR normally inside their webviews; main-process changes restart Electron.

**C — shell against staging apps:** point `RWP2_REGISTRY_URL` at the staging registry — real deployed apps, local shell. This is the integration environment for chrome work.

## 2. Environments & registry

| Env | Registry | Apps served from |
|---|---|---|
| dev | `registry.dev.json` (local file/port) | localhost ports |
| staging | `https://config.rev.internal/rwp2/staging/registry.json` | staging web servers |
| prod | `…/prod/registry.json` | prod web servers |

The installer embeds only the prod registry URL (overridable by env var for support). Adding an app to an environment = one registry entry + a deployed manifest; **no shell release**.

## 3. Versioning & compatibility

- `@rwp2/contracts|sdk|sdk-testing|ui` release as a **single version group** via `nx release` → internal npm.
- `CONTRACT_VERSION` (integer) changes only on breaking wire changes; the shell supports version N and N−1 during migration windows. Manifests declare what they need; the shell logs+hides apps that need newer.
- Additive changes (new optional fields, new channels) are minor releases — no manifest change needed.
- The shell/desktop installer has its own calver (e.g. `2026.07`); app versions are the teams' own.

## 4. CI (per PR, `nx affected`)

1. `nx affected -t lint,test,build` — module-boundary + max-lines rules fail the build.
2. Contracts changed? → run the **contract test suite**: zod schemas round-trip fixtures; SDK compiled against the new contracts; a golden `registry.json`+manifests validated.
3. Shell or desktop affected → Playwright e2e (shell + mock guests) + Electron smoke test.
4. Content app affected → its own tests + a manifest-validity check (`tools/scripts/validate-manifest.ts`).
5. Publishable libs on main: `nx release` dry-run gate, manual dispatch to publish.

External-repo teams mirror step 4 in their own CI using `@rwp2/contracts`' exported validators.

## 5. Packaging & distribution

- `nx build shell && nx build desktop` → electron-builder (`appId ie.revenue.rwp2`; win nsis + msi for enterprise deployment; mac dmg if needed).
- Shell bundle ships inside the installer; auto-update via the org's software distribution (electron-updater optional later).
- `backgroundColor:'#18181b'`, `minWidth 1100 × minHeight 640`, native frame, `autoHideMenuBar: true` (in-app menu bar per the prototype).
- Release checklist: contract suite green · staging registry boot with all 10 apps healthy · crash-card drill (kill a guest) · dirty-veto drill · persona/theme propagation to a live guest.

## 6. Suggested build order (workstreams)

| # | Deliverable | Depends on |
|---|---|---|
| W0 | `contracts` lib complete + published (03 verbatim) | — |
| W1 | Desktop skeleton: window, splash, auth bootstrap, store+reducers+tests, IPC router, persistence | W0 |
| W2 | Shell chrome static (bands, theming, tokens from `@rwp2/ui`) + state mirror | W0 |
| W3 | ContentHost + webview lifecycle + crash cards + sender registration | W1, W2 |
| W4 | Registry/manifest loading + menu aggregator (static → REST → IPC) + sidebar tree | W1 |
| W5 | SDK + sdk-testing + reference app (`customer-records`) end-to-end | W0, W3 |
| W6 | Tab strip complete (grouping, reorder, overflow), command center, persona/prefs | W2 |
| W7 | Legacy JSP guest path + second/third content apps + `@rwp2/plugin:content-app` generator (08) | W5 |
| W8 | Packaging, e2e suite, environment registries, onboarding doc for teams (=06) | all |

W1/W2 parallelize across two people/agents; W5 unblocks every domain team — prioritize it.
