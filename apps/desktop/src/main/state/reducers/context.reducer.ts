import type { CustomerRef, WorkbenchState } from '@rwp2/contracts';

const MAX_RECENTS = 6;

/**
 * openCustomer (04 §3): set the workbench customer, push to recents (dedup by
 * trn, cap 6), and flag every app's menu as `loading` so the sidebar shows the
 * pending state until the per-customer REST fetch resolves.
 */
export function openCustomer(
  state: WorkbenchState,
  customer: CustomerRef,
): WorkbenchState {
  const recents = [customer, ...state.recents.filter((c) => c.trn !== customer.trn)].slice(
    0,
    MAX_RECENTS,
  );
  return {
    ...state,
    context: { ...state.context, customer },
    recents,
    apps: state.apps.map((a) => ({ ...a, menuStatus: 'loading' as const })),
  };
}

export function setFavourite(state: WorkbenchState, trn: string, fav: boolean): WorkbenchState {
  const has = state.favourites.includes(trn);
  if (fav && !has) return { ...state, favourites: [...state.favourites, trn] };
  if (!fav && has) return { ...state, favourites: state.favourites.filter((t) => t !== trn) };
  return state;
}
