# 05 — Shell renderer (`apps/shell`)

Angular 21, standalone components, signals, OnPush, PrimeNG 21 (Aura/Emerald via `@rwp2/ui` preset), Tailwind v4 mapped to `--p-*` tokens. Visual spec: the workbench chrome of the design prototype (dark default, fixed bands, emerald status bar; menu bar 36px · tab strip 36px · rail 48/76px · sidebar 264px · status bar 24px; **the shell never scrolls** — only inner panels do).

## 1. State mirror (`state/workbench.store.ts`)

The shell holds **no authoritative state**. One injectable:

```ts
@Injectable({ providedIn: 'root' })
export class WorkbenchStore {
  private readonly _state = signal<WorkbenchState | null>(null);   // null = splash
  readonly state = this._state.asReadonly();
  readonly tabs = computed(() => this._state()?.tabs ?? []);
  readonly activeTab = computed(() => this.tabs().find(t => t.id === this._state()?.activeTabId) ?? null);
  readonly menu = computed(() => this._state()?.menu ?? []);
  // …one computed per chrome need (user, context, prefs, recents)

  constructor(host: HostService) {
    host.invoke('wb:getState', undefined).then(s => this._state.set(s));
    host.on('wb:stateChanged', patch => this._state.update(s => s ? { ...s, ...patch } : s));
  }
}
```

`HostService` is the only file touching `window.rwp2Shell`. All chrome components read computeds and call `NavigationService` (`openTarget`, `openCustomer`, `activateTab`, `closeTab`, `back`) which forwards commands to main. No component ever mutates locally what main owns.

Theme/density: an effect on `prefs` toggles `.app-dark`/`.light` and a density class on the root element — one frame, no reload.

## 2. Chrome components

Each is a folder with one component (+ small children), all reading the mirror:

| Component | Notes |
|---|---|
| `menu-bar` | brand `⚡ RWP2`, File/View/Customer/Help menus (custom dropdowns, not PrimeNG Menubar), centered command box, notifications bell |
| `command-center` | ⌘K overlay (opens on `wb:shortcut`), customer search + `›` command mode; selecting a result → `NavigationService` |
| `activity-rail` | explorer / search / queues / favourites / apps + settings cog; 3px emerald active bar |
| `sidebar` | header + panels; the explorer panel renders the **merged `MenuNode[]`** from state as the customer tree — group nodes = tree groups, leaves navigate via their `target`; per-app `menuStatus:'failed'` rows show a quiet retry (`wb:refreshAppMenu`) |
| `tab-strip` | renders `TabDescriptor[]`: icon, label, dirty `●`, close ×; customer-grouping chips per prefs; CDK drag-reorder → `wb:reorderTabs` |
| `status-bar` | emerald band: brand, user name, persona switcher (`wb:setPref`), active customer, Ready |
| `splash` | shown while `state() === null` (auth/registry boot) |

Dropdowns/dialogs are DOM overlays — they layer above webviews correctly (the point of D1). No special handling needed.

## 3. Content area (`content/`)

```ts
// content-area.component.ts — keeps one ContentHost per guest tab, switches visibility
@Component({ selector: 'rwp-content-area', template: `
  <div class="relative flex-1 min-h-0">
    @for (tab of guestTabs(); track tab.id) {
      <rwp-webview-tab [tab]="tab" [visible]="tab.id === activeId()" />
    }
    @if (activeTab()?.kind === 'shell') { <ng-container *ngComponentOutlet="shellScreen()" /> }
  </div>` })
```

Guest webviews are **kept mounted and hidden** when inactive (01 §3) — `@for` with `track tab.id` guarantees no re-creation on reorder/activation.

## 4. `WebviewContentHost` — the only `<webview>` file

```ts
// webview-content-host.ts (used by webview-tab.component)
export class WebviewContentHost implements ContentHost {
  private readonly el: Electron.WebviewTag;
  readonly events$ = new Subject<ContentHostEvent>();

  constructor(container: HTMLElement, readonly tabId: string, app: AppRuntimeInfo, private host: HostService) {
    const wv = document.createElement('webview');
    wv.setAttribute('partition', partitionFor(app));           // 'persist:rwp2' | isolated
    wv.setAttribute('preload', `file://${(window as any).rwp2Shell.guestPreloadPath}`);
    wv.setAttribute('allowpopups', 'false');
    wv.style.cssText = 'width:100%;height:100%;border:0;background:var(--p-content-background)';

    wv.addEventListener('did-attach', () =>                     // register sender BEFORE app code runs
      host.invoke('wb:guestEvent', { tabId, type: 'attached', webContentsId: wv.getWebContentsId() } as any));
    wv.addEventListener('dom-ready', () => this.emit({ tabId, type: 'loaded' }));
    wv.addEventListener('render-process-gone', (e: any) => this.emit({ tabId, type: 'crashed', reason: e.reason }));
    wv.addEventListener('did-fail-load', (e: any) => {
      if (e.errorCode !== -3 && e.isMainFrame) this.emit({ tabId, type: 'load-failed', code: e.errorCode, url: e.validatedURL });
    });
    wv.addEventListener('page-title-updated', (e: any) => this.emit({ tabId, type: 'title-changed', title: e.title }));
    container.appendChild(wv); this.el = wv;
  }
  load(url: string) { this.el.src = url; }
  show() { this.el.parentElement!.style.visibility = 'visible'; }
  hide() { this.el.parentElement!.style.visibility = 'hidden'; }   // NOT display:none — keeps layout/paint state warm
  postToGuest<C extends GuestPushChannel>(c: C, p: GuestPush[C]) { this.el.send(c, p); }
  reload() { this.el.reload(); }
  destroy() { this.el.remove(); this.events$.complete(); }
  private emit(e: ContentHostEvent) { this.events$.next(e); this.host.invoke('wb:guestEvent', e); }
}
```

Notes:
- URL: `entryUrl` + hash-encoded launch target, e.g. `https://apps.rev/customer-records/#/bank/3287645T` — the app's own Angular router takes it from there. Subsequent same-tab navigations arrive as `wb:navigateInPlace` pushes (main → shell → `postToGuest`) — no reload.
- Hidden tabs use `visibility:hidden` on a full-size absolutely-positioned wrapper, all stacked in the content area; exactly one visible.
- `webview-tab.component` owns a host instance, forwards `events$` upward, and swaps its body to `crash-card` on `crashed`/`load-failed`.

## 5. Crash & failure states

| Event | UI |
|---|---|
| `crashed` | crash card in the tab: icon, "This screen stopped responding", app name + reason, **Reload** (host.reload) — shell and other tabs unaffected |
| `load-failed` | same card, "Couldn't reach <app name>", Reload + "Check service status" hint |
| app missing from registry at tab-restore | main already dropped the tab (04 §7) — nothing to render |
| slow load | shell shows an indeterminate band under the breadcrumb row until `loaded`; guests are expected to paint their own skeletons |

## 6. proxy.conf.js (shell)

The shell's own REST needs (none beyond diagnostics in v1) and local-dev loading of `registry.dev.json`:

```js
// apps/shell/proxy.conf.js — dev only; keeps every local call same-origin on :4200
module.exports = {
  '/api':      { target: 'http://localhost:8080', changeOrigin: true, logLevel: 'debug' },
  '/registry': { target: 'http://localhost:4290', changeOrigin: true, pathRewrite: { '^/registry': '' } },
};
```

(Each content app carries its own `proxy.conf.js` — see 06 §4.)

## 7. Testing

- Chrome components: Vitest + Testing Library against a stubbed `WorkbenchStore` (set the signal, assert DOM).
- `WebviewContentHost`: contract-tested with a fake element implementing the webview surface.
- Playwright e2e: shell + `MockHost` guests (plain pages served locally, declared in `registry.dev.json`) — open tab, switch, dirty veto, crash-card on a page that self-terminates.
