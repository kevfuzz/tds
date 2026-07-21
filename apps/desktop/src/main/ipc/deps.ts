import type { GuestPush, GuestPushChannel, ShellPush, WorkbenchState } from '@rwp2/contracts';
import type { WorkbenchStore } from '../state/store';
import type { SenderRegistry } from './senders';
import type { MenuController } from '../menu/menu-controller';

/** Emit a scoped GuestPush directly to one guest's webContents (04 §3 — v1
 *  pushes from main straight to the guest, staying within the frozen channel
 *  map rather than adding a shell-relay channel). */
export type GuestPusher = <C extends GuestPushChannel>(
  tabId: string,
  channel: C,
  payload: GuestPush[C],
) => void;

/** Broadcast the current GuestContext to every live guest (context/user change). */
export type ContextBroadcaster = (state: WorkbenchState) => void;

/** Push a ShellPush (toast / shortcut) to the shell renderer. */
export type ShellPusher = <C extends keyof ShellPush>(channel: C, payload: ShellPush[C]) => void;

export interface CloseCoordinator {
  /** Runs the dirty-close guard flow (04 §4); resolves 'closed' | 'vetoed'. */
  requestClose(tabId: string): Promise<'closed' | 'vetoed'>;
  /** A guest's reply to a wb:beforeClose request. */
  reply(requestId: string, allow: boolean): void;
}

export interface Deps {
  store: WorkbenchStore;
  senders: SenderRegistry;
  menu: MenuController;
  pushToGuest: GuestPusher;
  pushToShell: ShellPusher;
  broadcastContext: ContextBroadcaster;
  close: CloseCoordinator;
  now: () => number;
}
