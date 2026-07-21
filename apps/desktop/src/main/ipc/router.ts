import { ipcMain } from 'electron';
import { GUEST_ONLY, SHELL_ONLY, type Commands } from '@rwp2/contracts';
import type { Deps } from './deps';
import * as nav from './handlers/navigation.handler';
import * as tabs from './handlers/tabs.handler';
import * as guest from './handlers/guest.handler';
import * as prefs from './handlers/prefs.handler';
import { guestEvent } from './handlers/lifecycle.handler';

/**
 * The ONLY ipcMain call site (02 §4). One line per channel in `Commands`.
 * Sender class is validated centrally: guest-only channels reject shell/unknown
 * senders and vice versa (03 §6) — a rejected handler throws, surfacing as an
 * invoke rejection in the offending renderer.
 */
export function createIpcRouter(deps: Deps): void {
  const handle = <C extends keyof Commands>(
    channel: C,
    fn: (senderId: number, payload: Commands[C]['in']) => Commands[C]['out'] | Promise<Commands[C]['out']>,
  ): void => {
    ipcMain.handle(channel, (e, payload) => {
      const senderId = e.sender.id;
      if (GUEST_ONLY.has(channel)) deps.senders.requireGuest(senderId);
      else if (SHELL_ONLY.has(channel)) deps.senders.requireShell(senderId);
      return fn(senderId, payload as Commands[C]['in']);
    });
  };

  // shared
  handle('wb:navigate', (s, p) => nav.navigate(deps, s, p));
  handle('wb:openCustomer', (s, p) => nav.openCustomer(deps, s, p));
  handle('wb:getUser', () => guest.getUser(deps));

  // guest-only
  handle('wb:getContext', (s) => guest.getContext(deps, s));
  handle('wb:setDirty', (s, p) => guest.setDirty(deps, s, p));
  handle('wb:contributeMenu', (s, p) => guest.contributeMenu(deps, s, p));
  handle('wb:notify', (s, p) => guest.notify(deps, s, p));
  handle('wb:beforeCloseReply', (s, p) => guest.beforeCloseReply(deps, s, p));

  // shell-only
  handle('wb:getState', () => prefs.getState(deps));
  handle('wb:activateTab', (s, p) => tabs.activateTab(deps, s, p));
  handle('wb:closeTab', (s, p) => tabs.closeTab(deps, s, p));
  handle('wb:reorderTabs', (s, p) => tabs.reorderTabs(deps, s, p));
  handle('wb:back', (s, p) => nav.back(deps, s, p));
  handle('wb:forward', (s, p) => nav.forward(deps, s, p));
  handle('wb:setPref', (s, p) => prefs.setPref(deps, s, p));
  handle('wb:setFavourite', (s, p) => prefs.setFavourite(deps, s, p));
  handle('wb:refreshAppMenu', (s, p) => prefs.refreshAppMenu(deps, s, p));
  handle('wb:guestEvent', (s, p) => guestEvent(deps, s, p));
}
