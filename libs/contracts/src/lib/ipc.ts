import type { CurrentUser, GuestContext } from './identity';
import type { MenuNode } from './menu';
import type { NavigationTarget } from './navigation';
import type { Prefs, WorkbenchState, StatePatch } from './state';

/** 03 §6 — IPC channel map. One declaration; both preloads and router derive from it. */

export type Severity = 'info' | 'warn' | 'error';

/**
 * Lifecycle a webview reports up to main via `wb:guestEvent`.
 *
 * The `attached` variant extends the doc's four-case union: the shell fires it
 * from the webview `did-attach` event carrying `getWebContentsId()` so main can
 * register the sender BEFORE any guest code runs (04 §4, 05 §4). Modelled
 * explicitly here rather than cast `as any` at the call site.
 */
export type ContentHostEvent =
  | { tabId: string; type: 'attached'; webContentsId: number }
  | { tabId: string; type: 'loaded' }
  | { tabId: string; type: 'crashed'; reason: string }
  | { tabId: string; type: 'load-failed'; code: number; url: string }
  | { tabId: string; type: 'title-changed'; title: string };

/** Renderer → main, request/response (ipcRenderer.invoke). */
export interface Commands {
  // shell + guests
  'wb:navigate': { in: NavigationTarget; out: void };
  'wb:openCustomer': { in: { trn: string }; out: void };
  'wb:getUser': { in: void; out: CurrentUser };
  // guests only (sender-scoped; tabId/appId come from the sender registry, never the payload)
  'wb:getContext': { in: void; out: GuestContext };
  'wb:setDirty': { in: { dirty: boolean }; out: void };
  'wb:contributeMenu': { in: { items: MenuNode[] }; out: void };
  'wb:notify': { in: { severity: Severity; summary: string; detail?: string }; out: void };
  'wb:beforeCloseReply': { in: { requestId: string; allow: boolean }; out: void };
  // shell only
  'wb:getState': { in: void; out: WorkbenchState };
  'wb:activateTab': { in: { tabId: string }; out: void };
  'wb:closeTab': { in: { tabId: string }; out: 'closed' | 'vetoed' };
  'wb:reorderTabs': { in: { orderedIds: string[] }; out: void };
  'wb:back': { in: { tabId: string }; out: void };
  'wb:forward': { in: { tabId: string }; out: void };
  'wb:setPref': { in: Partial<Prefs>; out: void };
  'wb:setFavourite': { in: { trn: string; fav: boolean }; out: void };
  'wb:refreshAppMenu': { in: { appId: string }; out: void }; // sidebar retry
  'wb:guestEvent': { in: ContentHostEvent; out: void }; // shell reports webview lifecycle
}

/** Main → shell (webContents.send). */
export interface ShellPush {
  'wb:stateChanged': StatePatch;
  'wb:toast': { severity: Severity; summary: string; detail?: string; appId: string };
  'wb:shortcut': { id: 'commandCenter' | 'toggleSidebar' };
}

/** Main → one guest, and shell→guest relays (host.postToGuest). */
export interface GuestPush {
  'wb:contextChanged': GuestContext;
  'wb:navigateInPlace': NavigationTarget; // guest routes internally, then may setDirty(false)
  'wb:beforeClose': { requestId: string }; // reply via wb:beforeCloseReply within 3s (else close proceeds)
}
export type GuestPushChannel = keyof GuestPush;

/** Channel-name constants, enumerated once so router + preloads iterate them. */
export const SHARED_COMMAND_CHANNELS = ['wb:navigate', 'wb:openCustomer', 'wb:getUser'] as const;

export const GUEST_COMMAND_CHANNELS = [
  'wb:getContext',
  'wb:setDirty',
  'wb:contributeMenu',
  'wb:notify',
  'wb:beforeCloseReply',
] as const;

export const SHELL_COMMAND_CHANNELS = [
  'wb:getState',
  'wb:activateTab',
  'wb:closeTab',
  'wb:reorderTabs',
  'wb:back',
  'wb:forward',
  'wb:setPref',
  'wb:setFavourite',
  'wb:refreshAppMenu',
  'wb:guestEvent',
] as const;

export const COMMAND_CHANNELS = [
  ...SHARED_COMMAND_CHANNELS,
  ...GUEST_COMMAND_CHANNELS,
  ...SHELL_COMMAND_CHANNELS,
] as const;

export const SHELL_PUSH_CHANNELS = ['wb:stateChanged', 'wb:toast', 'wb:shortcut'] as const;
export const GUEST_PUSH_CHANNELS = [
  'wb:contextChanged',
  'wb:navigateInPlace',
  'wb:beforeClose',
] as const;

/** Sets used by the router's sender-validation guard (03 §6). */
export const GUEST_ONLY = new Set<keyof Commands>(GUEST_COMMAND_CHANNELS);
export const SHELL_ONLY = new Set<keyof Commands>(SHELL_COMMAND_CHANNELS);
