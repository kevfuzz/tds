# RWP2 — Federated Workbench: Technical Design

**Status:** v1.0 · standalone technical design (functional behavior of the shell chrome is illustrated by the prototype `Tax Management System.dc.html`; this design supersedes `IMPLEMENTATION_PLAN.md`, which described a single-app build).
**Audience:** implementing agents / engineers. Every contract in these docs is normative.

RWP2 is a VSCode-style desktop workbench for Revenue caseworkers. A **central team** owns the **shell** (window chrome, tabs, sidebar, search, state). **~10 domain teams** own **content apps** — independently built and deployed Angular web applications (plus legacy JSP apps) that render inside the shell's content area, each in an isolated `<webview>`. **Electron** is the glue: it hosts the single source of truth for workbench state, routes all cross-app communication over typed IPC, and enforces security policy.

## Document map

| Doc | Contents |
|---|---|
| [01-architecture.md](01-architecture.md) | Process model, layering, embedding decision (`<webview>` behind a `ContentHost` abstraction), tab/instance model, ownership boundaries |
| [02-workspace.md](02-workspace.md) | Nx monorepo layout folder-by-folder, publishable libs for external-repo teams, module-boundary rules, file-size and structure guardrails |
| [03-contracts.md](03-contracts.md) | **Normative TypeScript**: `@rwp2/contracts` — workbench state model, IPC channel map, guest bridge API, app manifest & registry schema, menu contribution REST contract |
| [04-electron-main.md](04-electron-main.md) | Main process: bootstrap & auth sequence, state store + reducers, IPC router with sender validation, menu aggregator, webview security policy, persistence |
| [05-shell.md](05-shell.md) | Shell renderer: chrome components, state mirroring, the `ContentHost` component with full webview lifecycle code, crash/error handling |
| [06-content-apps.md](06-content-apps.md) | Building a content app: `@rwp2/sdk` usage, embedded vs standalone-dev modes, `proxy.conf.js`, legacy JSP guests, team checklist |
| [07-dev-build-release.md](07-dev-build-release.md) | Dev workflow, registry environments, lib publishing & versioning, CI, packaging |
| [08-generator.md](08-generator.md) | `@rwp2/plugin:content-app` workspace generator: options, generated tree, template rules, standalone-repo mode |
| `RWP2 Tech Design Diagrams.dc.html` | Architecture & sequence diagrams (boot, customer open → menu aggregation, cross-app navigation, dirty-close guard) |

## Decisions at a glance

| # | Decision | Rationale (details in 01) |
|---|---|---|
| D1 | Content apps embed via **`<webview>`**, wrapped in a `ContentHost` abstraction so the host mechanism can be swapped (WebContentsView, iframe) without touching apps | `<webview>` is a DOM element: it composites *in the page*, so shell overlays (menus, ⌘K, dialogs, floating windows) layer correctly above content. `WebContentsView` is a native view that always paints above the DOM. Apps never know the mechanism — they only know `window.rwp2Host`. |
| D2 | **One webview per tab** | Simple, matches user mental model, per-tab isolation and crash containment. Memory cost accepted; LRU suspension is a designed-in later optimization (01 §6). |
| D3 | **Electron main process is the single source of truth** for workbench state (tabs, context, prefs, menu, dirty flags). Renderers send commands, receive state patches. | Survives shell reloads and content crashes; one place to persist; guests and shell can never disagree. |
| D4 | Apps are **served from internal web servers** and discovered via a **registry + per-app manifest** | Independent deploys per team; shell release decoupled from app releases. |
| D5 | Sidebar menu = **static manifest items** + **per-customer REST endpoint** (declared in the manifest, called by main on customer open) + **live IPC contributions** from running apps | Static items appear instantly and work when an app is down; REST covers customer/user-specific items without the app being loaded; IPC covers dynamic items only a running app knows (e.g. its open drafts). |
| D6 | Auth: shell **blocks on `GET /api/session/current`** before loading any content; the resolved `CurrentUser` is pushed to every guest via the bridge; apps that carry their own security may *also* call the same endpoint themselves | One canonical identity for chrome configuration; zero coupling for apps that self-authorize. |
| D7 | **Nx monorepo** hosting shell + willing teams' apps; `@rwp2/contracts`, `@rwp2/sdk`, `@rwp2/sdk-testing`, `@rwp2/ui` are **publishable** to the internal npm registry for teams in their own repos | Same contract artifacts whether a team is inside or outside the monorepo. |
| D8 | Legacy JSP apps are **just another webview guest** with `integration: 'legacy'` — no SDK, static-menu-only, degraded (but defined) behavior | One embedding pipeline; no special JSP machinery in the shell. |
| D9 | Angular **21**, PrimeNG **21** (Aura preset, Emerald/Zinc), Tailwind **v4**, Nx (latest), Electron (latest stable at kickoff, pinned) | Fixed by product decision. |

## Glossary

- **Shell** — the Angular workbench app owned by the central team: menu bar, command center, activity rail, sidebar, tab strip, status bar, content area.
- **Content app** — an independently deployed web app rendered in the content area. `sdk` integration = modern Angular using `@rwp2/sdk`; `legacy` = JSP or other apps with no RWP2 code.
- **Guest** — a content app instance running inside one webview.
- **Bridge** — the API surface injected into every guest webview by the preload script: `window.rwp2Host` (typed as `GuestHostApi`).
- **Manifest** — `rwp2.manifest.json`, served by each app, describing identity, entry URL, permissions, menu contributions.
- **Registry** — the environment-level JSON listing the manifest URLs of all deployed apps.
- **Workbench state** — the canonical state object owned by main: user, context (customer/persona/theme/density), tabs, menu tree, prefs.
- **Tab key** — deterministic identity of a tab (`appId` + normalized path + context), used for reuse-vs-new decisions.
