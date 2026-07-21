import { Subject } from 'rxjs';
import type {
  AppRuntimeInfo,
  ContentHostEvent,
  GuestPush,
  GuestPushChannel,
} from '@rwp2/contracts';
import type { ContentHost } from './content-host';
import type { HostService } from '../services/host.service';

/**
 * Minimal structural view of Electron's `<webview>` tag — the only surface this
 * host touches. Kept local (and injectable in tests) so the shell needs no
 * Electron type dependency and the contract test (05 §7) can supply a fake.
 */
export interface WebviewElement extends HTMLElement {
  src: string;
  getWebContentsId(): number;
  send(channel: string, payload: unknown): void;
  reload(): void;
}

/** Shared SSO partition by default; isolated apps get their own (04 §6). */
function partitionFor(app: AppRuntimeInfo): string {
  return app.manifest.session?.partition === 'isolated'
    ? `persist:rwp2-app-${app.manifest.id}`
    : 'persist:rwp2';
}

/**
 * The ONLY file in the shell that creates/touches a `<webview>` (01 §2, 02 §4).
 * Faithful to 05 §4: hidden tabs use `visibility:hidden` on their wrapper (never
 * `display:none`) to keep paint state warm; every lifecycle event is both
 * emitted locally (`events$`) and reported to main (`wb:guestEvent`).
 */
export class WebviewContentHost implements ContentHost {
  private readonly el: WebviewElement;
  readonly events$ = new Subject<ContentHostEvent>();

  constructor(
    container: HTMLElement,
    readonly tabId: string,
    app: AppRuntimeInfo,
    private host: HostService,
    createEl: () => WebviewElement = () => document.createElement('webview') as WebviewElement,
  ) {
    const wv = createEl();
    wv.setAttribute('partition', partitionFor(app)); // 'persist:rwp2' | isolated
    wv.setAttribute('preload', `file://${host.guestPreloadPath}`);
    wv.setAttribute('allowpopups', 'false');
    wv.style.cssText = 'width:100%;height:100%;border:0;background:var(--p-content-background)';

    // register sender BEFORE app code runs (04 §4)
    wv.addEventListener('did-attach', () =>
      this.host.invoke('wb:guestEvent', {
        tabId,
        type: 'attached',
        webContentsId: wv.getWebContentsId(),
      }),
    );
    wv.addEventListener('dom-ready', () => this.emit({ tabId, type: 'loaded' }));
    wv.addEventListener('render-process-gone', (e) =>
      this.emit({ tabId, type: 'crashed', reason: (e as unknown as { reason: string }).reason }),
    );
    wv.addEventListener('did-fail-load', (e) => {
      const ev = e as unknown as { errorCode: number; isMainFrame: boolean; validatedURL: string };
      if (ev.errorCode !== -3 && ev.isMainFrame) {
        this.emit({ tabId, type: 'load-failed', code: ev.errorCode, url: ev.validatedURL });
      }
    });
    wv.addEventListener('page-title-updated', (e) =>
      this.emit({ tabId, type: 'title-changed', title: (e as unknown as { title: string }).title }),
    );
    container.appendChild(wv);
    this.el = wv;
  }

  load(url: string): void {
    this.el.src = url;
  }
  show(): void {
    this.el.parentElement!.style.visibility = 'visible';
  }
  hide(): void {
    this.el.parentElement!.style.visibility = 'hidden'; // NOT display:none — keeps layout/paint warm
  }
  postToGuest<C extends GuestPushChannel>(c: C, p: GuestPush[C]): void {
    this.el.send(c, p);
  }
  reload(): void {
    this.el.reload();
  }
  destroy(): void {
    this.el.remove();
    this.events$.complete();
  }
  private emit(e: ContentHostEvent): void {
    this.events$.next(e);
    this.host.invoke('wb:guestEvent', e);
  }
}
