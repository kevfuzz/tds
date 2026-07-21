import {
  ChangeDetectionStrategy,
  Component,
  Type,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import type { TabDescriptor } from '@rwp2/contracts';
import { WorkbenchStore } from '../state/workbench.store';
import { WebviewTabComponent } from './webview-tab.component';

/**
 * Tab → host mapping and visibility switching (05 §3). One `ContentHost` per
 * GUEST tab, all kept mounted and hidden — `@for` with `track tab.id` guarantees
 * no re-creation on reorder/activation (01 §3). Shell-native tabs render their
 * lazy component through `ngComponentOutlet`.
 */
@Component({
  selector: 'rwp-content-area',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WebviewTabComponent, NgComponentOutlet],
  host: { class: 'block' },
  template: `
    <div class="relative min-h-0 w-full flex-1">
      @for (tab of guestTabs(); track tab.id) {
        <rwp-webview-tab [tab]="tab" [visible]="tab.id === activeId()" />
      }
      @if (activeTab()?.kind === 'shell' && shellScreen()) {
        <div class="absolute inset-0 overflow-auto">
          <ng-container *ngComponentOutlet="shellScreen()!" />
        </div>
      }
    </div>
  `,
})
export class ContentAreaComponent {
  private readonly store = inject(WorkbenchStore);

  readonly activeId = this.store.activeTabId;
  readonly activeTab = this.store.activeTab;
  readonly guestTabs = computed<TabDescriptor[]>(() =>
    this.store.tabs().filter((t) => t.kind === 'guest'),
  );

  /** Resolved (lazily-imported) component for the active shell tab, or null. */
  readonly shellScreen = signal<Type<unknown> | null>(null);

  constructor() {
    effect(() => {
      const tab = this.activeTab();
      if (!tab || tab.kind !== 'shell') {
        this.shellScreen.set(null);
        return;
      }
      void loadShellScreen(tab).then((c) => this.shellScreen.set(c));
    });
  }
}

/** Registry of shell-native screens, keyed by the target path (01 §3). */
async function loadShellScreen(tab: TabDescriptor): Promise<Type<unknown> | null> {
  const path = tab.target.path.replace(/^\/+/, '');
  if (path.startsWith('preferences')) {
    const m = await import('../screens/preferences/preferences.component');
    return m.PreferencesComponent;
  }
  return null;
}
