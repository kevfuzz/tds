import { Injectable, inject } from '@angular/core';
import type { NavigationTarget, Prefs } from '@rwp2/contracts';
import { HostService } from './host.service';

/**
 * The command surface chrome components use. Every user gesture that changes
 * main-owned state goes through here → `HostService` → main. Components MUST
 * call this service, never `HostService` (and never `window.rwp2Shell`).
 */
@Injectable({ providedIn: 'root' })
export class NavigationService {
  private readonly host = inject(HostService);

  /** Open (or activate, on key match) a navigation target. */
  openTarget(target: NavigationTarget): Promise<void> {
    return this.host.invoke('wb:navigate', target);
  }

  /** Set the workbench-level open customer by TRN. */
  openCustomer(trn: string): Promise<void> {
    return this.host.invoke('wb:openCustomer', { trn });
  }

  activateTab(tabId: string): Promise<void> {
    return this.host.invoke('wb:activateTab', { tabId });
  }

  /** Returns 'vetoed' when a dirty guest's close guard refused. */
  closeTab(tabId: string): Promise<'closed' | 'vetoed'> {
    return this.host.invoke('wb:closeTab', { tabId });
  }

  reorderTabs(orderedIds: string[]): Promise<void> {
    return this.host.invoke('wb:reorderTabs', { orderedIds });
  }

  back(tabId: string): Promise<void> {
    return this.host.invoke('wb:back', { tabId });
  }

  forward(tabId: string): Promise<void> {
    return this.host.invoke('wb:forward', { tabId });
  }

  setPref(patch: Partial<Prefs>): Promise<void> {
    return this.host.invoke('wb:setPref', patch);
  }

  setFavourite(trn: string, fav: boolean): Promise<void> {
    return this.host.invoke('wb:setFavourite', { trn, fav });
  }

  /** Retry a per-app customer-menu fetch that failed (sidebar quiet retry). */
  refreshAppMenu(appId: string): Promise<void> {
    return this.host.invoke('wb:refreshAppMenu', { appId });
  }
}
