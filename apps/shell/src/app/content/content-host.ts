import type { Observable } from 'rxjs';
import type { ContentHostEvent, GuestPush, GuestPushChannel } from '@rwp2/contracts';

/**
 * The embedding abstraction (01 §2, normative). No code outside
 * `apps/shell/src/app/content/` may touch a webview element. `WebviewContentHost`
 * is the v1 implementation; a `WebContentsViewContentHost` could replace it
 * without guests noticing (they only ever see `window.rwp2Host`).
 */
export interface ContentHost {
  readonly tabId: string;
  load(url: string): void;
  show(): void;
  hide(): void; // visibility, not destruction
  postToGuest<C extends GuestPushChannel>(channel: C, payload: GuestPush[C]): void;
  reload(): void;
  destroy(): void;
  readonly events$: Observable<ContentHostEvent>; // loaded | crashed | failed | title-changed
}
