import type { CurrentUser, GuestContext, MenuNode, Severity } from '@rwp2/contracts';
import type { Deps } from '../deps';
import { guestContext } from '../../state/selectors';

/** wb:getUser — served from main's cache, no network (D6 / 01 §7). */
export function getUser(deps: Deps): CurrentUser {
  return deps.store.state.user;
}

/** wb:getContext — sender-scoped; tabId comes from the registry, not payload. */
export function getContext(deps: Deps, senderId: number): GuestContext {
  const g = deps.senders.requireGuest(senderId);
  const ctx = guestContext(deps.store.state, g.tabId);
  if (!ctx) throw new Error(`no context for tab ${g.tabId}`);
  return ctx;
}

export function setDirty(deps: Deps, senderId: number, p: { dirty: boolean }): void {
  const g = deps.senders.requireGuest(senderId);
  deps.store.dispatch({ type: 'setDirty', tabId: g.tabId, dirty: p.dirty });
}

/** wb:contributeMenu — live IPC contribution, scoped to the sender's app (01 §6). */
export function contributeMenu(deps: Deps, senderId: number, p: { items: MenuNode[] }): void {
  const g = deps.senders.requireGuest(senderId);
  deps.menu.setLive(g.appId, p.items);
}

/** wb:notify — a guest raises a toast; main forwards it to the shell tagged with
 *  the originating app id (the guest cannot spoof another app's id). */
export function notify(
  deps: Deps,
  senderId: number,
  p: { severity: Severity; summary: string; detail?: string },
): void {
  const g = deps.senders.requireGuest(senderId);
  deps.pushToShell('wb:toast', { ...p, appId: g.appId });
}

export function beforeCloseReply(
  deps: Deps,
  senderId: number,
  p: { requestId: string; allow: boolean },
): void {
  deps.senders.requireGuest(senderId);
  deps.close.reply(p.requestId, p.allow);
}
