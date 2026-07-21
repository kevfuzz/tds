import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import type { Subscription } from 'rxjs';
import type { AppRuntimeInfo, ContentHostEvent, NavigationTarget, TabDescriptor } from '@rwp2/contracts';
import { WorkbenchStore } from '../state/workbench.store';
import { HostService } from '../services/host.service';
import { WebviewContentHost } from './webview-content-host';
import { CrashCardComponent, type CrashKind } from './crash-card.component';

/**
 * Owns exactly one `WebviewContentHost` for its tab's lifetime (01 §3, 05 §4).
 * Kept mounted always; visibility is toggled via the host (`visibility:hidden`).
 * On `crashed`/`load-failed` it overlays a crash card without unloading (so a
 * reload can recover in place).
 */
@Component({
  selector: 'rwp-webview-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrashCardComponent],
  template: `
    <div #mount class="absolute inset-0" [style.visibility]="visible() ? 'visible' : 'hidden'">
      @if (failure(); as f) {
        <div class="absolute inset-0 z-10">
          <rwp-crash-card [kind]="f" [appName]="appName()" [reason]="reason()" (reload)="retry()" />
        </div>
      }
    </div>
  `,
})
export class WebviewTabComponent {
  readonly tab = input.required<TabDescriptor>();
  readonly visible = input.required<boolean>();

  private readonly store = inject(WorkbenchStore);
  private readonly host = inject(HostService);
  private readonly mount = viewChild.required<ElementRef<HTMLElement>>('mount');

  private contentHost?: WebviewContentHost;
  private sub?: Subscription;

  readonly failure = signal<CrashKind | null>(null);
  readonly reason = signal<string | undefined>(undefined);

  private readonly app = computed<AppRuntimeInfo | null>(
    () => this.store.apps().find((a) => a.manifest.id === this.tab().appId) ?? null,
  );
  readonly appName = computed(() => this.app()?.manifest.name ?? this.tab().appId);

  constructor() {
    afterNextRender(() => this.initHost());
    // React to activation without recreating the webview (keeps guest state).
    effect(() => {
      const visible = this.visible();
      if (this.contentHost) (visible ? this.contentHost.show() : this.contentHost.hide());
    });
    inject(DestroyRef).onDestroy(() => {
      this.sub?.unsubscribe();
      this.contentHost?.destroy();
    });
  }

  private initHost(): void {
    const app = this.app();
    if (!app || !this.host.available) return;
    const tab = this.tab();
    this.contentHost = new WebviewContentHost(this.mount().nativeElement, tab.id, app, this.host);
    this.sub = this.contentHost.events$.subscribe((e) => this.onEvent(e));
    this.contentHost.load(urlFor(app, tab.target));
    if (this.visible()) this.contentHost.show();
    else this.contentHost.hide();
  }

  private onEvent(e: ContentHostEvent): void {
    if (e.type === 'crashed') {
      this.reason.set(e.reason);
      this.failure.set('crashed');
    } else if (e.type === 'load-failed') {
      this.reason.set(`error ${e.code}`);
      this.failure.set('load-failed');
    } else if (e.type === 'loaded') {
      this.failure.set(null);
    }
  }

  retry(): void {
    this.failure.set(null);
    this.contentHost?.reload();
  }
}

/**
 * Build the guest URL: `entryUrl` + hash-encoded launch target (05 §4), e.g.
 * `https://apps.rev/customer-records/#/bank/3287645T`. The guest's own router
 * takes over from there; later same-tab moves arrive as `wb:navigateInPlace`.
 */
function urlFor(app: AppRuntimeInfo, target: NavigationTarget): string {
  const base = app.manifest.entryUrl.replace(/#.*$/, '').replace(/\/$/, '');
  const query = target.params
    ? '?' + new URLSearchParams(target.params).toString()
    : '';
  const path = target.path.startsWith('/') ? target.path : `/${target.path}`;
  return `${base}/#${path}${query}`;
}
