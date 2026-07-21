import type { ContentHostEvent } from '@rwp2/contracts';
import type { Deps } from '../deps';

/**
 * wb:guestEvent — the shell reports webview lifecycle (05 §4). The critical case
 * is `attached`: main registers the webContents → {appId, tabId} in the
 * SenderRegistry BEFORE any guest code runs, so the guest can invoke its scoped
 * channels (03 §6). Until registered, a webContents can invoke nothing.
 */
export function guestEvent(deps: Deps, senderId: number, event: ContentHostEvent): void {
  deps.senders.requireShell(senderId); // only the shell reports lifecycle

  if (event.type === 'attached') {
    const tab = deps.store.state.tabs.find((t) => t.id === event.tabId);
    if (tab) deps.senders.registerGuest(event.webContentsId, tab.appId, event.tabId);
    return;
  }
  // loaded | crashed | load-failed | title-changed: shell renders these; main
  // keeps the sender registered until the tab is closed (handled in closeTab).
}
