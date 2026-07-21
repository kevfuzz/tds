import type { CustomerRef, NavigationTarget } from '@rwp2/contracts';
import type { Deps } from '../deps';
import { planOpen } from '../../state/reducers/tabs.reducer';

function ensureCustomer(deps: Deps, customer: CustomerRef): void {
  if (deps.store.state.context.customer?.trn === customer.trn) return;
  deps.store.dispatch({ type: 'openCustomer', customer, now: deps.now() });
  deps.store.dispatch({ type: 'menuLoading', appIds: deps.store.state.apps.map((a) => a.manifest.id) });
  void deps.menu.refreshForCustomer(customer.trn, deps.store.state.context.persona);
  deps.broadcastContext(deps.store.state);
}

/** wb:navigate — shell or guest. Sets/overrides customer context, resolves the
 *  open decision, then pushes wb:navigateInPlace when the guest handled it in
 *  place (04 §3). */
export function navigate(deps: Deps, _senderId: number, target: NavigationTarget): void {
  if (target.appId !== 'shell' && !deps.store.state.apps.some((a) => a.manifest.id === target.appId)) {
    return; // unknown app — ignore
  }
  if (target.customer) ensureCustomer(deps, target.customer);

  const plan = planOpen(deps.store.state, target);
  deps.store.dispatch({ type: 'openTarget', target, id: deps.store.nextTabId(), now: deps.now() });

  if (plan.kind === 'inPlace') {
    deps.pushToGuest(plan.tabId, 'wb:navigateInPlace', target);
  }
}

export function openCustomer(deps: Deps, _senderId: number, p: { trn: string }): void {
  const known =
    deps.store.state.recents.find((c) => c.trn === p.trn) ??
    ({ trn: p.trn, name: p.trn, type: 'Individual' } as CustomerRef);
  ensureCustomer(deps, known);
}

export function back(deps: Deps, _senderId: number, p: { tabId: string }): void {
  deps.store.dispatch({ type: 'navBack', tabId: p.tabId, now: deps.now() });
  const tab = deps.store.state.tabs.find((t) => t.id === p.tabId);
  if (tab) deps.pushToGuest(p.tabId, 'wb:navigateInPlace', tab.target);
}

export function forward(deps: Deps, _senderId: number, p: { tabId: string }): void {
  deps.store.dispatch({ type: 'navForward', tabId: p.tabId, now: deps.now() });
  const tab = deps.store.state.tabs.find((t) => t.id === p.tabId);
  if (tab) deps.pushToGuest(p.tabId, 'wb:navigateInPlace', tab.target);
}
