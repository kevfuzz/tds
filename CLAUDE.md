# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

RWP2 — Federated Workbench: a VSCode-style Electron desktop workbench for Revenue
caseworkers. A central team owns the **shell** (window chrome, tabs, sidebar,
command center, state); ~10 domain teams own **content apps** rendered inside the
shell, each isolated in an Electron `<webview>`. The **Electron main process is
the single source of truth** for all workbench state and routes every cross-app
message over typed IPC.

The normative spec lives in [`tech-design/`](tech-design/README.md) — docs are
numbered 01–08 and every contract in them is binding. When behavior is
ambiguous, the tech-design doc wins over the code; section references like
`04 §3` throughout the codebase point back to it. `libs/contracts` is the
realization of `03-contracts.md`.

## Commands

Nx monorepo (npm workspaces). Tasks: `build`, `test` (Vitest), `lint`, `serve`.

```bash
npm install
nx run-many -t test                         # all unit tests
nx run-many -t lint build                    # boundary + max-lines rules gate the build
nx test contracts                            # one project's tests
nx test desktop --skip-nx-cache              # bypass the Nx cache
npx vitest run apps/desktop/src/main/menu/aggregator.spec.ts   # a single spec file
npm run test:pure                            # contracts + desktop pure logic (no Angular/Electron needed)

# full workbench, everything local (tech-design/07 §1):
nx run-many -t serve --projects=shell,content-customer-records,content-work-queues,content-forms
RWP2_REGISTRY_URL=http://localhost:4200/registry/registry.dev.json nx serve desktop

# scaffold a new content app (tech-design/08):
nx g @rwp2/plugin:content-app --name=debt-management --icon="pi pi-briefcase" --port=4205
```

Note: `apps/desktop` builds via esbuild to CommonJS with three entry points —
main (`src/main/index.ts`) plus the two preloads (`src/preload/*.preload.ts`);
`electron` is marked external. The pure state/contract logic is designed to run
under `tsc --strict` and Vitest without a full `npm install`.

## Architecture — the big picture

The data flow is a strict loop. **Renderers (shell + guests) send commands; main
mutates state; main pushes state patches back.** No renderer ever holds
authoritative state — the shell's store is a mirror.

- **`libs/contracts` (`@rwp2/contracts`)** is the *only* surface that crosses an
  ownership boundary. It has zero deps beyond zod and depends on nothing else in
  the graph. `src/lib/ipc.ts` is the single channel map: `Commands` (renderer→main
  invoke), `ShellPush` and `GuestPush` (main→renderer send). Both preloads and the
  router derive their channel lists from the exported `*_CHANNELS` constants — add
  a channel here and in the relevant handler, never invent a bare string elsewhere.

- **`apps/desktop` (Electron main)** owns state via `WorkbenchStore` +
  **pure reducers** (`src/main/state/`). `store.ts` dispatches an `Action` through
  `rootReducer`, diffs old→new into a `wb:stateChanged` patch, and notifies
  listeners; the composition root wires those listeners to IPC. Reducers, selectors,
  the menu `aggregator`, the `menu-cache`, `SenderRegistry`, and manifest resolution
  are all **pure and unit-tested** (see `*.spec.ts` alongside them). The IPC router
  (`src/main/ipc/`) validates every sender against the `SenderRegistry` before
  dispatching: `wb:tabId`/`appId` come from the registry, **never from the payload**;
  `GUEST_ONLY`/`SHELL_ONLY` sets enforce which side may call each channel.

- **`apps/shell` (Angular 21)** renders chrome (`src/app/chrome/*`: menu bar,
  command center ⌘K, activity rail, sidebar menu tree, tab strip, status bar) and
  the content area. `ContentHost` is an abstraction (`content-host.ts`) with a
  `<webview>` implementation (`webview-content-host.ts`) — apps only ever see
  `window.rwp2Host`, so the embedding mechanism can be swapped. `workbench.store.ts`
  is the **read-only mirror** of main's state, hydrated from patches.

- **`apps/content-*`** are independent Angular apps. `content-customer-records` is
  the **reference template** teams copy. Each has an `rwp2.manifest.json` (served
  from `public/`) declaring identity, entry URL, permissions, menu contributions,
  and an optional per-customer menu REST endpoint. They talk to the shell only
  through `@rwp2/sdk` (`provideWorkbench()` / `Workbench`), and run standalone in
  dev against `@rwp2/sdk-testing`'s `MockHost`.

- **`tools/plugin` (`@rwp2/plugin`)** is the Nx generator `content-app` that
  scaffolds a boundary-compliant app by construction. `tools/scripts/validate-manifest.ts`
  is the CI manifest gate. `tools/registry/registry.dev.json` is the local dev registry.

Key runtime sequences (all diagrammed in tech-design): boot = auth (blocking
`GET /api/session/current`) → registry → manifest resolution; customer open →
three-source sidebar menu aggregation (static manifest items ∪ per-customer REST ∪
live IPC contributions from running apps, with per-source failure isolation);
cross-app `navigate`; and the dirty-close guard (`wb:beforeClose` → guest replies
within 3s or close proceeds).

## Conventions enforced by tooling (do not fight these)

- **Module boundaries** (`eslint.config.mjs`, `@nx/enforce-module-boundaries`)
  keyed off the `scope:*` tag in each `project.json`. The allowed graph:
  `contracts` → nothing; `sdk`/`sdk-testing`/`ui` → only `contracts`; `shell` →
  `contracts` + `ui`; `desktop` → only `contracts`; `content` →
  `contracts`/`sdk`/`sdk-testing`/`ui`. **Content apps can never import shell or
  each other's code.** New projects must carry the correct `scope:` tag.
- **File budget**: `max-lines` errors at 300 (`.spec`/`.test` and generated files
  excluded). Modules here are deliberately small and single-purpose — split rather
  than grow a file past the budget.
- **Path aliases**: import cross-lib code via `@rwp2/contracts` etc. (mapped in
  `tsconfig.base.json`), never by relative path across a project boundary.
- TypeScript is `strict` with `noImplicitReturns` and `noFallthroughCasesInSwitch`.
- `contracts`, `sdk`, `sdk-testing`, `ui` are the **publishable** libs (`nx release`,
  fixed-version group) — teams in external repos consume the same artifacts.
