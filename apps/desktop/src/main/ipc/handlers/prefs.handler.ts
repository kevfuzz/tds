import type { Prefs, WorkbenchState } from '@rwp2/contracts';
import type { Deps } from '../deps';

/** wb:getState — the shell's initial full mirror (05 §1). */
export function getState(deps: Deps): WorkbenchState {
  return deps.store.state;
}

/** wb:setPref — persona/theme/density change; mirrored to context → guests. */
export function setPref(deps: Deps, _senderId: number, patch: Partial<Prefs>): void {
  const before = deps.store.state.context;
  deps.store.dispatch({ type: 'setPref', prefs: patch });
  if (deps.store.state.context !== before) deps.broadcastContext(deps.store.state);
}

export function setFavourite(
  deps: Deps,
  _senderId: number,
  p: { trn: string; fav: boolean },
): void {
  deps.store.dispatch({ type: 'setFavourite', trn: p.trn, fav: p.fav });
}

/** wb:refreshAppMenu — sidebar retry affordance for a failed per-app fetch. */
export function refreshAppMenu(deps: Deps, _senderId: number, p: { appId: string }): void {
  const customer = deps.store.state.context.customer;
  if (!customer) return;
  void deps.menu.refreshApp(p.appId, customer.trn, deps.store.state.context.persona);
}
