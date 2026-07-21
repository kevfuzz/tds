import type { CurrentUser, GuestContext } from './identity';
import type { Commands, ShellPush, Severity } from './ipc';
import type { MenuNode } from './menu';
import type { NavigationTarget } from './navigation';

/** 03 §7 — Bridge APIs (what the preloads expose). */

/** window.rwp2Host — injected into every guest by guest.preload.ts. */
export interface GuestHostApi {
  readonly apiVersion: number; // CONTRACT_VERSION
  getUser(): Promise<CurrentUser>;
  getContext(): Promise<GuestContext>;
  onContextChanged(cb: (ctx: GuestContext) => void): () => void;
  onNavigateInPlace(cb: (t: NavigationTarget) => void): () => void;
  navigate(target: NavigationTarget): Promise<void>;
  openCustomer(trn: string): Promise<void>;
  setDirty(dirty: boolean): void;
  contributeMenu(items: MenuNode[]): void;
  notify(n: { severity: Severity; summary: string; detail?: string }): void;
  /** Register a close guard; return false (or a rejecting promise) to veto. One handler max. */
  onBeforeClose(handler: () => boolean | Promise<boolean>): () => void;
}

/** window.rwp2Shell — injected into the shell by shell.preload.ts. */
export interface ShellHostApi {
  invoke<C extends keyof Commands>(channel: C, payload: Commands[C]['in']): Promise<Commands[C]['out']>;
  on<C extends keyof ShellPush>(channel: C, cb: (p: ShellPush[C]) => void): () => void;
  guestPreloadPath: string; // absolute path for the <webview preload> attribute
}

declare global {
  interface Window {
    rwp2Host?: GuestHostApi;
    rwp2Shell?: ShellHostApi;
  }
}
