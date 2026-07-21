import { InjectionToken } from '@angular/core';
import type { CurrentUser, GuestHostApi, WorkbenchContext } from '@rwp2/contracts';

/** Standalone-dev seed (06 §3): fake user + initial workbench context. */
export interface StandaloneConfig {
  user?: CurrentUser;
  context?: Partial<WorkbenchContext>;
}

/** Options for `provideWorkbench()`. */
export interface WorkbenchConfig {
  standalone?: StandaloneConfig;
}

/** The bound `GuestHostApi` — the real bridge, or the MockHost fallback. */
export const GUEST_HOST = new InjectionToken<GuestHostApi>('rwp2.guestHost');

/** True only when a genuine shell bridge (`window.rwp2Host`) is present. */
export const IS_EMBEDDED = new InjectionToken<boolean>('rwp2.embedded');

/** The config passed to `provideWorkbench()`. */
export const WORKBENCH_CONFIG = new InjectionToken<WorkbenchConfig>('rwp2.workbenchConfig');

/** Read the injected bridge (03 §7). Never read `window.rwp2Host` in app code. */
export function hasHostBridge(): boolean {
  return typeof window !== 'undefined' && !!window.rwp2Host;
}

/** Resolve the bound host once the bridge (real or mock) is installed. */
export function requireHost(): GuestHostApi {
  if (typeof window !== 'undefined' && window.rwp2Host) return window.rwp2Host;
  throw new Error('[rwp2/sdk] No GuestHostApi bound. Did provideWorkbench() run?');
}
