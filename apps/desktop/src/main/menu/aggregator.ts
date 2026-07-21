import type { AppRuntimeInfo, MenuNode } from '@rwp2/contracts';

/** Per-app result of the customer-menu REST fetch (04 §5). */
export interface AppMenuResult {
  appId: string;
  status: 'ok' | 'failed';
  items: MenuNode[];
}

/** Canonical sidebar group order; unknown groups sort after, alphabetically. */
const GROUP_ORDER = ['registrations', 'profiles', 'financials', 'external', 'forms'];
const GROUP_LABELS: Record<string, string> = {
  registrations: 'Registrations',
  profiles: 'Profiles',
  financials: 'Financials',
  external: 'External',
  forms: 'Forms',
};

function groupRank(group: string): number {
  const i = GROUP_ORDER.indexOf(group);
  return i < 0 ? GROUP_ORDER.length : i;
}

/** Namespace an item's id (and its subtree) to '<appId>/<id>' so apps cannot
 *  collide or spoof one another (01 §6). Targets are left untouched. */
function namespace(appId: string, node: MenuNode): MenuNode {
  return {
    ...node,
    id: `${appId}/${node.id}`,
    children: node.children?.map((c) => namespace(appId, c)),
  };
}

/**
 * Merge the three contribution sources for every app — static (manifest) ∪ REST
 * ∪ live IPC — namespace ids, group, and sort (group → registry/app order →
 * `order` → label). Pure: the exhaustive 04 §9 tests drive it directly.
 */
export function aggregateMenu(
  apps: AppRuntimeInfo[],
  rest: AppMenuResult[],
  live: Map<string, MenuNode[]>,
): { menu: MenuNode[]; statuses: Record<string, 'ok' | 'failed'> } {
  const appIndex = new Map(apps.map((a, i) => [a.manifest.id, i]));
  const restByApp = new Map(rest.map((r) => [r.appId, r]));
  const statuses: Record<string, 'ok' | 'failed'> = {};

  type Tagged = { appId: string; node: MenuNode };
  const tagged: Tagged[] = [];

  for (const app of apps) {
    const appId = app.manifest.id;
    const staticItems = app.manifest.menu?.static ?? [];
    const restResult = restByApp.get(appId);
    const restItems = restResult?.items ?? [];
    const liveItems = live.get(appId) ?? [];
    statuses[appId] = restResult?.status ?? 'ok';
    for (const item of [...staticItems, ...restItems, ...liveItems]) {
      tagged.push({ appId, node: namespace(appId, item) });
    }
  }

  const buckets = new Map<string, Tagged[]>();
  for (const t of tagged) {
    const g = t.node.group;
    (buckets.get(g) ?? buckets.set(g, []).get(g)!).push(t);
  }

  const groupKeys = [...buckets.keys()].sort((a, b) => {
    const r = groupRank(a) - groupRank(b);
    return r !== 0 ? r : a.localeCompare(b);
  });

  const menu: MenuNode[] = groupKeys.map((group) => {
    const items = buckets.get(group)!;
    items.sort((a, b) => {
      const ai = appIndex.get(a.appId) ?? Number.MAX_SAFE_INTEGER;
      const bi = appIndex.get(b.appId) ?? Number.MAX_SAFE_INTEGER;
      if (ai !== bi) return ai - bi;
      const ao = a.node.order ?? Number.MAX_SAFE_INTEGER;
      const bo = b.node.order ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return a.node.label.localeCompare(b.node.label);
    });
    return {
      id: `group/${group}`,
      label: GROUP_LABELS[group] ?? group,
      group,
      children: items.map((t) => t.node),
    };
  });

  return { menu, statuses };
}
