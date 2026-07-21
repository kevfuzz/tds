import {
  tabKey,
  type AppRuntimeInfo,
  type NavigationTarget,
  type TabDescriptor,
  type WorkbenchState,
} from '@rwp2/contracts';

/** Decision the open-target flow resolves to (04 §3). Exported so the
 *  navigation handler and the reducer share ONE implementation — the handler
 *  needs the decision to know whether to push `wb:navigateInPlace` (04 §3). */
export type OpenDecision =
  | { kind: 'reuse'; tabId: string }
  | { kind: 'inPlace'; tabId: string }
  | { kind: 'append' };

function appFor(state: WorkbenchState, appId: string): AppRuntimeInfo | undefined {
  return state.apps.find((a) => a.manifest.id === appId);
}

function sameCustomer(tab: TabDescriptor, target: NavigationTarget): boolean {
  return !target.customer || target.customer.trn === tab.customerTrn;
}

/** reuse-by-key → in-place → append (04 §3). Pure; depends only on `state`. */
export function planOpen(state: WorkbenchState, target: NavigationTarget): OpenDecision {
  const mode = target.openMode ?? 'reuse';
  const key = tabKey(target);

  if (mode !== 'newTab') {
    const existing = state.tabs.find((t) => t.key === key);
    if (existing) return { kind: 'reuse', tabId: existing.id };

    const active = state.tabs.find((t) => t.id === state.activeTabId);
    if (
      active &&
      active.kind === 'guest' &&
      active.appId === target.appId &&
      sameCustomer(active, target) &&
      !state.prefs.alwaysOpenNewTab
    ) {
      return { kind: 'inPlace', tabId: active.id };
    }
  }
  return { kind: 'append' };
}

function labelFor(target: NavigationTarget, app: AppRuntimeInfo | undefined): string {
  if (target.label) return target.label;
  const base = app?.manifest.name ?? target.appId;
  return target.customer ? `${base} · ${target.customer.name}` : base;
}

function makeTab(
  state: WorkbenchState,
  target: NavigationTarget,
  id: string,
  now: number,
): TabDescriptor {
  const app = appFor(state, target.appId);
  const kind = target.appId === 'shell' ? 'shell' : 'guest';
  const customerTrn = target.customer?.trn ?? state.context.customer?.trn ?? null;
  const base = app?.manifest.name ?? target.appId;
  return {
    id,
    kind,
    appId: target.appId,
    key: tabKey(target),
    target,
    label: labelFor(target, app),
    shortLabel: base,
    icon: app?.manifest.icon ?? 'pi pi-window-maximize',
    customerTrn,
    dirty: false,
    closeable: true,
    lastActiveAt: now,
    history: [],
    forward: [],
  };
}

function stamp(tabs: TabDescriptor[], id: string, now: number): TabDescriptor[] {
  return tabs.map((t) => (t.id === id ? { ...t, lastActiveAt: now } : t));
}

export function openTarget(
  state: WorkbenchState,
  target: NavigationTarget,
  id: string,
  now: number,
): WorkbenchState {
  // Guard: unknown non-shell app → no-op (handler should have filtered).
  if (target.appId !== 'shell' && !appFor(state, target.appId)) return state;

  const decision = planOpen(state, target);

  if (decision.kind === 'reuse') {
    return { ...state, activeTabId: decision.tabId, tabs: stamp(state.tabs, decision.tabId, now) };
  }

  if (decision.kind === 'inPlace') {
    const tabs = state.tabs.map((t) => {
      if (t.id !== decision.tabId) return t;
      return {
        ...t,
        history: [...t.history, t.target],
        forward: [],
        target,
        key: tabKey(target),
        label: labelFor(target, appFor(state, target.appId)),
        customerTrn: target.customer?.trn ?? t.customerTrn,
        lastActiveAt: now,
      };
    });
    return { ...state, activeTabId: decision.tabId, tabs };
  }

  const tab = makeTab(state, target, id, now);
  return { ...state, tabs: [...state.tabs, tab], activeTabId: tab.id };
}

export function closeTab(state: WorkbenchState, tabId: string): WorkbenchState {
  const idx = state.tabs.findIndex((t) => t.id === tabId);
  if (idx < 0) return state;
  const tabs = state.tabs.filter((t) => t.id !== tabId);
  let activeTabId = state.activeTabId;
  if (state.activeTabId === tabId) {
    const neighbour = tabs[idx - 1] ?? tabs[idx] ?? null; // left neighbour, else right, else none
    activeTabId = neighbour ? neighbour.id : null;
  }
  return { ...state, tabs, activeTabId };
}

export function activateTab(state: WorkbenchState, tabId: string, now: number): WorkbenchState {
  if (!state.tabs.some((t) => t.id === tabId)) return state;
  return { ...state, activeTabId: tabId, tabs: stamp(state.tabs, tabId, now) };
}

export function reorderTabs(state: WorkbenchState, orderedIds: string[]): WorkbenchState {
  const byId = new Map(state.tabs.map((t) => [t.id, t]));
  const reordered = orderedIds.map((id) => byId.get(id)).filter((t): t is TabDescriptor => !!t);
  // Preserve any tabs the client didn't mention (defensive), appended in order.
  const missing = state.tabs.filter((t) => !orderedIds.includes(t.id));
  return { ...state, tabs: [...reordered, ...missing] };
}

export function setDirty(state: WorkbenchState, tabId: string, dirty: boolean): WorkbenchState {
  const tab = state.tabs.find((t) => t.id === tabId);
  if (!tab || tab.dirty === dirty) return state; // reference-stable no-op
  return { ...state, tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, dirty } : t)) };
}

function step(
  state: WorkbenchState,
  tabId: string,
  now: number,
  dir: 'back' | 'forward',
): WorkbenchState {
  return {
    ...state,
    activeTabId: tabId,
    tabs: state.tabs.map((t) => {
      if (t.id !== tabId) return t;
      const from = dir === 'back' ? t.history : t.forward;
      if (from.length === 0) return t;
      const next = from[from.length - 1];
      const rest = from.slice(0, -1);
      const other = dir === 'back' ? [...t.forward, t.target] : [...t.history, t.target];
      return dir === 'back'
        ? { ...t, target: next, history: rest, forward: other, lastActiveAt: now }
        : { ...t, target: next, forward: rest, history: other, lastActiveAt: now };
    }),
  };
}

export const navBack = (s: WorkbenchState, id: string, now: number) => step(s, id, now, 'back');
export const navForward = (s: WorkbenchState, id: string, now: number) => step(s, id, now, 'forward');
