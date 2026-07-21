# 08 — Workspace generator spec: `@rwp2/plugin:content-app`

A local Nx plugin (`tools/plugin`, name `@rwp2/plugin`) with one generator that scaffolds a fully-wired content app. Encodes every convention from 06 so a new team starts compliant by construction.

## 1. Invocation & options (`schema.json`)

```
nx g @rwp2/plugin:content-app --name=debt-management --displayName="Debt management" --icon="pi pi-briefcase" --port=4205
```

| Option | Type | Default | Notes |
|---|---|---|---|
| `name` | string (kebab-case, required) | — | app id everywhere: project name, manifest `id`, API prefix |
| `displayName` | string | title-cased `name` | manifest `name`, tab labels |
| `icon` | string | `pi pi-box` | must match `^pi pi-[a-z-]+$` |
| `port` | number | next free 42xx (scans existing `project.json` serve ports) | dev serve port; written into `registry.dev.json` |
| `backendPort` | number | `port + 4000` | proxy target for the team's local Java service |
| `customerMenu` | boolean | `true` | include `customerMenuUrl` in the manifest + a sample JSON fixture endpoint note |
| `standaloneRepo` | boolean | `false` | emit to a self-contained folder (own `package.json` pinning `@rwp2/*`) instead of `apps/`, for teams outside the monorepo |

Validation failures (bad kebab-case, port collision, duplicate app id in any registry file) abort before writing.

## 2. Generated tree (monorepo mode)

```
apps/content-<name>/
  project.json                  # tags: ['scope:content']; serve target with proxyConfig; port
  proxy.conf.js                 # '/api/<name>' → :<backendPort> · '/api/session' → :8080
  public/rwp2.manifest.json     # contractVersion, id, name, icon, integration:'sdk',
                                #   requiredPermissions:['app.<name>'], menu.static (1 item),
                                #   menu.customerMenuUrl (if --customerMenu)
  src/
    main.ts  index.html  styles.css        # Tailwind entry + @rwp2/ui tokens import
    app/
      app.config.ts             # provideRouter(routes, withHashLocation()) · provideWorkbench()
                                #   · providePrimeNG({theme: rwp2AuraPreset})
      app.routes.ts             # '' → redirect '/overview'; '/overview' → OverviewScreen (lazy)
      screens/overview/
        overview.screen.ts      # reads Workbench.context (customer signal), shows an
                                #   EmptyState from @rwp2/ui when no customer; setDirty demo
        overview.screen.spec.ts # Vitest + MockHost: renders fixture customer; navigate() spy
```

Also **edits**: `tools/registry/registry.dev.json` (adds the manifest URL for `:port`) and `tsconfig.base.json`/lint config only if needed. Nothing else in the workspace is touched — verified by the generator's own test (`nx affected` after generation must list only the new project + registry file).

## 3. Template rules (what the stamped code must demonstrate)

The generated app is a **teaching artifact** — each convention appears once, working:

1. Hash routing; app boots at `entryUrl#/overview`.
2. `Workbench` injectable used for context/user — never `window.rwp2Host`.
3. One `setDirty(true/false)` + `registerCloseGuard` example (a comment-marked demo form field).
4. One cross-app `navigate()` call behind a button, target `{appId:'forms', path:'/…'}`.
5. All REST relative (`/api/<name>/…`); no hardcoded hosts anywhere.
6. Manifest zod-valid (generator runs `appManifestSchema.parse` on its own output as a post-step).
7. Files respect the 200/300-line budget; components standalone + OnPush + signals.

## 4. Standalone-repo mode (`--standaloneRepo`)

Same tree plus: `package.json` (Angular 21, PrimeNG 21, Tailwind 4, pinned `@rwp2/contracts|sdk|sdk-testing|ui` at the current published version), `.npmrc` (`@rwp2:registry=…`), `angular.json`-equivalent build config, `README.md` (condensed 06 checklist). Emitted to `dist/team-templates/content-<name>/` for handover — the central team runs the generator; the receiving team owns the result. No `registry.dev.json` edit (their app registers via the environment registry instead).

## 5. Plugin structure & tests

```
tools/plugin/
  src/generators/content-app/
    schema.json  schema.d.ts
    generator.ts               # ≤200 lines: validate → generateFiles(templates) → edits → format
    files/                     # EJS templates (__name__ substitution)
    generator.spec.ts          # runs in a test tree: output compiles, manifest parses,
                               #   port collision rejected, affected-scope check
```

CI: the generator spec runs in the normal `nx affected -t test` path; additionally a nightly job generates a throwaway app, builds it, and boots it against the dev shell headlessly (guards against template rot as the SDK evolves).

## 6. Out of scope

- No `legacy` variant — a legacy app is just a manifest + registry entry (06 §6); nothing to scaffold.
- No backend scaffolding — the Java `customerMenuUrl` implementation belongs to the team; the generator only documents the expected response shape in the manifest comment.
