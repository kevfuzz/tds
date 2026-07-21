import type { MenuNode } from '@rwp2/contracts';
import type { WorkbenchStore } from '../state/store';
import { aggregateMenu, type AppMenuResult } from './aggregator';
import { fetchCustomerMenus } from './customer-menu.client';
import { MenuCache } from './menu-cache';

/**
 * Owns the two non-static contribution sources (04 §5): the live IPC map
 * (`Map<appId, MenuNode[]>`, cleared when an app's last tab closes) and the
 * cached per-customer REST results. Recomputes the merged tree and dispatches
 * `menuResolved` whenever any source changes.
 */
export class MenuController {
  private readonly cache = new MenuCache();
  private readonly live = new Map<string, MenuNode[]>();
  private lastRest: AppMenuResult[] = [];

  constructor(private readonly store: WorkbenchStore) {}

  private recompute(): void {
    const { menu, statuses } = aggregateMenu(this.store.state.apps, this.lastRest, this.live);
    this.store.dispatch({ type: 'menuResolved', menu, statuses });
  }

  /** Static-only merge at boot (before any customer is open). */
  recomputeStatic(): void {
    this.lastRest = [];
    this.recompute();
  }

  setLive(appId: string, items: MenuNode[]): void {
    this.live.set(appId, items);
    this.recompute();
  }

  clearApp(appId: string): void {
    if (this.live.delete(appId)) this.recompute();
  }

  /** On customer open/switch: parallel REST fetch, then recompute (04 §5). */
  async refreshForCustomer(trn: string, persona: string): Promise<void> {
    this.lastRest = await fetchCustomerMenus(this.store.state.apps, trn, persona, this.cache);
    this.recompute();
  }

  /** `wb:refreshAppMenu` — bust cache for one app and refetch for the open customer. */
  async refreshApp(appId: string, trn: string, persona: string): Promise<void> {
    this.cache.bust(appId);
    await this.refreshForCustomer(trn, persona);
  }
}
