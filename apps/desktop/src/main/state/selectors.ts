import type { GuestContext, WorkbenchState } from '@rwp2/contracts';
import { SLICE_KEYS } from './actions';

/** The full authoritative state the shell mirrors. */
export function shellState(state: WorkbenchState): WorkbenchState {
  return state;
}

/**
 * The scoped view one guest is allowed to see (01 §4, 03 §1). Guests never see
 * other guests' tabs or state — main hands each only its `GuestContext`.
 * `launch` is the target the tab was originally opened with.
 */
export function guestContext(state: WorkbenchState, tabId: string): GuestContext | null {
  const tab = state.tabs.find((t) => t.id === tabId);
  if (!tab) return null;
  return {
    ...state.context,
    appId: tab.appId,
    tabId,
    user: state.user,
    launch: tab.history[0] ?? tab.target,
  };
}

/** Compute the changed top-level slices between two states → `wb:stateChanged`
 *  patch (03 §3): main sends only what changed. */
export function diffPatch(
  prev: WorkbenchState,
  next: WorkbenchState,
): Partial<WorkbenchState> {
  const patch: Partial<WorkbenchState> = {};
  for (const key of SLICE_KEYS) {
    if (prev[key] !== next[key]) {
      (patch as Record<string, unknown>)[key] = next[key];
    }
  }
  return patch;
}
