import type { CurrentUser, CustomerRef, Density, Theme, WorkbenchContext } from './identity';
import type { AppManifest } from './manifest';
import type { MenuNode } from './menu';
import type { NavigationTarget } from './navigation';

/** 03 §3 — Tabs & workbench state. */

export interface TabDescriptor {
  id: string; // 't' + monotonic counter
  kind: 'guest' | 'shell'; // shell-native screens vs webview guests
  appId: string; // for kind:'shell', 'shell'
  key: string; // tabKey — reuse identity
  target: NavigationTarget; // current target (updated by in-place nav)
  label: string;
  shortLabel: string;
  icon: string; // 'pi pi-*'
  customerTrn: string | null;
  dirty: boolean;
  closeable: boolean;
  lastActiveAt: number; // epoch ms — feeds future SuspensionPolicy
  history: NavigationTarget[];
  forward: NavigationTarget[];
}

export interface AppRuntimeInfo {
  manifest: AppManifest;
  origin: string; // resolved origin of entryUrl — navigation allowlist
  menuStatus: 'ok' | 'loading' | 'failed'; // per-customer REST fetch status
}

export interface Prefs {
  theme: Theme;
  density: Density;
  groupTabsByCustomer: boolean;
  alwaysOpenNewTab: boolean;
  persona: string;
}

export interface WorkbenchState {
  user: CurrentUser;
  context: WorkbenchContext;
  apps: AppRuntimeInfo[];
  tabs: TabDescriptor[];
  activeTabId: string | null;
  menu: MenuNode[]; // merged sidebar tree for current context
  prefs: Prefs;
  recents: CustomerRef[]; // max 6
  favourites: string[]; // TRNs
}

/**
 * State updates to the shell are patches: main sends only changed top-level
 * slices; the shell mirror merges them.
 */
export type StatePatch = Partial<WorkbenchState>;
