# RWP2 — Federated Workbench

A VSCode-style desktop workbench for Revenue caseworkers. A central team owns the
**shell** (window chrome, tabs, sidebar, search, state); ~10 domain teams own
**content apps** rendered inside the shell, each in an isolated Electron
`<webview>`. Electron main is the single source of truth for workbench state and
routes all cross-app communication over typed IPC.

This repository is the implementation of the normative technical design in
[`tech-design/`](tech-design/README.md). Start there — every contract is defined
in [`tech-design/03-contracts.md`](tech-design/03-contracts.md) and realized in
`libs/contracts`.

## Workspace layout (Nx monorepo)

| Path | Package | Role |
|---|---|---|
| `libs/contracts` | `@rwp2/contracts` | **Normative** types + zod schemas + IPC channel map. Zero deps beyond zod. The only cross-boundary surface. |
| `libs/sdk` | `@rwp2/sdk` | Angular layer over the guest bridge — `provideWorkbench()`, `Workbench`. |
| `libs/sdk-testing` | `@rwp2/sdk-testing` | `MockHost` for unit tests + standalone dev. |
| `libs/ui` | `@rwp2/ui` | `tokens.css`, Tailwind v4 preset, PrimeNG Aura/Emerald preset, dumb components. |
| `apps/desktop` | Electron main + preloads | Bootstrap (auth→registry), `WorkbenchStore` + pure reducers, IPC router with sender validation, menu aggregator, webview security policy, persistence. |
| `apps/shell` | Angular 21 shell | Chrome (menu bar, ⌘K, rail, sidebar, tab strip, status bar) + the `ContentHost`/`<webview>` content area. State mirror only — no authoritative state. |
| `apps/content-customer-records` | Reference content app | The template teams copy: manifest, SDK wiring, routed screens, MockHost test. |
| `apps/content-work-queues`, `apps/content-forms` | Content apps | Second/third apps (incl. the cross-app `navigate` target `/vat3`). |
| `tools/plugin` | `@rwp2/plugin` | Nx generator `content-app` — scaffolds a compliant app by construction (08). |
| `tools/registry/registry.dev.json` | — | Local dev registry (localhost app ports). |
| `tools/scripts/validate-manifest.ts` | — | CI manifest-validity gate (07 §4). |

Module boundaries (`@nx/enforce-module-boundaries`) and a 200/300-line file
budget are enforced in `eslint.config.mjs` per the `scope:*` tags in each
`project.json` (02 §3/§4).

## Architecture decisions

See the decision table in [`tech-design/README.md`](tech-design/README.md).
Highlights: `<webview>` behind a swappable `ContentHost` abstraction (D1); one
webview per tab (D2); Electron main as the single source of truth (D3);
registry + per-app manifest discovery (D4); three-source sidebar menu
aggregation — static ∪ per-customer REST ∪ live IPC (D5); blocking
`GET /api/session/current` auth (D6).

## Develop, build, test

```bash
npm install                       # Angular 21 / PrimeNG 21 / Electron / Nx
nx run-many -t test               # all unit tests (Vitest)
nx run-many -t lint build         # module-boundary + max-lines rules gate the build

# full workbench, everything local (07 §1):
nx run-many -t serve --projects=shell,content-customer-records,content-work-queues,content-forms
RWP2_REGISTRY_URL=http://localhost:4200/registry/registry.dev.json nx serve desktop

# scaffold a new content app (08):
nx g @rwp2/plugin:content-app --name=debt-management --icon="pi pi-briefcase" --port=4205
```

## Verification status

The **pure, normative logic** — the parts 04 §9 / 07 §4 mandate be covered —
was authored test-first and verified in this environment (Node 22 / Vitest /
`tsc --strict`):

- `@rwp2/contracts`: strict typecheck clean; tab-key + zod round-trip tests pass.
- `apps/desktop` state engine: `tabs`/`context`/`prefs`/`menu` reducers, the
  `WorkbenchStore`, selectors (scoped `guestContext`, patch diffing), the menu
  `aggregator` (namespacing / grouping / ordering / failure isolation), the menu
  TTL cache, the `SenderRegistry` validation, and manifest resolution — **48
  unit tests pass; the pure module graph typechecks strict-clean**.

The Angular renderer (`apps/shell`), the publishable Angular libs, the content
apps, and the Electron-runtime files (windows, preloads, bootstrap net calls)
are implemented to the spec but require `npm install` (Angular/Electron/Nx —
network-restricted here) to build and run; they are exercised by the Vitest
component specs, the Playwright e2e suite, and the Electron smoke test described
in 05 §7 / 07 §4 once dependencies are installed.
