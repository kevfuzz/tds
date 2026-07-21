import type { NavigationTarget, WorkbenchState } from '@rwp2/contracts';

/** The persisted slice (04 §7). Pure shape — the fs write lives in persistence.ts. */
export interface DurableSlice {
  prefs: WorkbenchState['prefs'];
  recents: WorkbenchState['recents'];
  favourites: string[];
  tabs: NavigationTarget[]; // restorable launch targets, in order
  activeTabKey: string | null;
}

export function toDurableSlice(state: WorkbenchState): DurableSlice {
  const active = state.tabs.find((t) => t.id === state.activeTabId) ?? null;
  return {
    prefs: state.prefs,
    recents: state.recents,
    favourites: state.favourites,
    tabs: state.tabs.filter((t) => t.kind === 'guest').map((t) => t.history[0] ?? t.target),
    activeTabKey: active?.key ?? null,
  };
}

/**
 * Restorable targets, dropping any whose app is no longer known/permitted
 * (04 §7 — unknown state falls back silently). `knownAppIds` is the set of apps
 * that survived the registry load.
 */
export function restorableTargets(
  slice: DurableSlice,
  knownAppIds: Set<string>,
): NavigationTarget[] {
  return slice.tabs.filter((t) => knownAppIds.has(t.appId));
}
