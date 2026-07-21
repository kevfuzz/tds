import type { MenuNode, WorkbenchState } from '@rwp2/contracts';

/** Flag the given apps' menus as loading (04 §3) — set on customer open. */
export function menuLoading(state: WorkbenchState, appIds: string[]): WorkbenchState {
  const set = new Set(appIds);
  return {
    ...state,
    apps: state.apps.map((a) =>
      set.has(a.manifest.id) ? { ...a, menuStatus: 'loading' as const } : a,
    ),
  };
}

/** Apply a freshly-aggregated menu tree plus per-app fetch statuses (04 §5). */
export function menuResolved(
  state: WorkbenchState,
  menu: MenuNode[],
  statuses: Record<string, 'ok' | 'failed'>,
): WorkbenchState {
  return {
    ...state,
    menu,
    apps: state.apps.map((a) => {
      const s = statuses[a.manifest.id];
      return s ? { ...a, menuStatus: s } : a;
    }),
  };
}
