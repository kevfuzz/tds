import type {
  AppRuntimeInfo,
  CurrentUser,
  CustomerRef,
  MenuNode,
  NavigationTarget,
  Prefs,
} from '@rwp2/contracts';

/**
 * The reducer action union (04 §3). Every action is fully resolved by the
 * caller: identity (`id`) and time (`now`) are injected by the store/handlers
 * so reducers stay pure and deterministic — the discipline 04 §9 tests demand.
 */
export type Action =
  | { type: 'boot'; user: CurrentUser; apps: AppRuntimeInfo[]; prefs?: Partial<Prefs> }
  | { type: 'openTarget'; target: NavigationTarget; id: string; now: number }
  | { type: 'activateTab'; tabId: string; now: number }
  | { type: 'closeTab'; tabId: string }
  | { type: 'reorderTabs'; orderedIds: string[] }
  | { type: 'setDirty'; tabId: string; dirty: boolean }
  | { type: 'navBack'; tabId: string; now: number }
  | { type: 'navForward'; tabId: string; now: number }
  | { type: 'openCustomer'; customer: CustomerRef; now: number }
  | { type: 'setPref'; prefs: Partial<Prefs> }
  | { type: 'setFavourite'; trn: string; fav: boolean }
  | { type: 'menuLoading'; appIds: string[] }
  | { type: 'menuResolved'; menu: MenuNode[]; statuses: Record<string, 'ok' | 'failed'> };

/** Which top-level state slices an action may touch — drives patch computation. */
export const SLICE_KEYS = [
  'user',
  'context',
  'apps',
  'tabs',
  'activeTabId',
  'menu',
  'prefs',
  'recents',
  'favourites',
] as const;
