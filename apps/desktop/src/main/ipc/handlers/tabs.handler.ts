import type { Deps } from '../deps';

export function activateTab(deps: Deps, _senderId: number, p: { tabId: string }): void {
  deps.store.dispatch({ type: 'activateTab', tabId: p.tabId, now: deps.now() });
}

export function reorderTabs(deps: Deps, _senderId: number, p: { orderedIds: string[] }): void {
  deps.store.dispatch({ type: 'reorderTabs', orderedIds: p.orderedIds });
}

/**
 * wb:closeTab (04 §4). The CloseCoordinator runs the dirty-close guard flow
 * (beforeClose → 3s timer → reply/timeout). On close, clear the app's live menu
 * contributions if that was its last tab. Returns 'closed' | 'vetoed'.
 */
export async function closeTab(
  deps: Deps,
  _senderId: number,
  p: { tabId: string },
): Promise<'closed' | 'vetoed'> {
  const tab = deps.store.state.tabs.find((t) => t.id === p.tabId);
  if (!tab) return 'closed';

  const outcome = await deps.close.requestClose(p.tabId);
  if (outcome === 'vetoed') return 'vetoed';

  const appId = tab.appId;
  const wcId = deps.senders.guestWebContentsId(p.tabId);
  if (wcId !== undefined) deps.senders.unregister(wcId);
  deps.store.dispatch({ type: 'closeTab', tabId: p.tabId });

  const stillOpen = deps.store.state.tabs.some((t) => t.appId === appId);
  if (!stillOpen) deps.menu.clearApp(appId);

  return 'closed';
}
