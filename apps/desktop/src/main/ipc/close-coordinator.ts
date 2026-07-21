import type { CloseCoordinator, GuestPusher } from './deps';
import type { WorkbenchStore } from '../state/store';

interface Pending {
  resolve: (allow: boolean) => void;
  timer: ReturnType<typeof setTimeout>;
}

const GUARD_TIMEOUT_MS = 3000;

/**
 * The dirty-close guard flow (04 §4). For a dirty, sdk-integrated tab: push
 * `wb:beforeClose {requestId}` to the guest, start a 3s timer; the guest replies
 * `wb:beforeCloseReply {requestId, allow}` or the timer fires (close proceeds).
 * Legacy and non-dirty tabs skip straight to close.
 */
export class GuardedCloseCoordinator implements CloseCoordinator {
  private readonly pending = new Map<string, Pending>();
  private seq = 0;

  constructor(
    private readonly store: WorkbenchStore,
    private readonly pushToGuest: GuestPusher,
    private readonly isLegacy: (appId: string) => boolean,
  ) {}

  requestClose(tabId: string): Promise<'closed' | 'vetoed'> {
    const tab = this.store.state.tabs.find((t) => t.id === tabId);
    if (!tab || !tab.dirty || tab.kind !== 'guest' || this.isLegacy(tab.appId)) {
      return Promise.resolve('closed');
    }

    const requestId = `close-${++this.seq}`;
    return new Promise<'closed' | 'vetoed'>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        resolve('closed'); // timeout → close proceeds
      }, GUARD_TIMEOUT_MS);

      this.pending.set(requestId, {
        resolve: (allow) => resolve(allow ? 'closed' : 'vetoed'),
        timer,
      });
      this.pushToGuest(tabId, 'wb:beforeClose', { requestId });
    });
  }

  reply(requestId: string, allow: boolean): void {
    const p = this.pending.get(requestId);
    if (!p) return;
    clearTimeout(p.timer);
    this.pending.delete(requestId);
    p.resolve(allow);
  }
}
