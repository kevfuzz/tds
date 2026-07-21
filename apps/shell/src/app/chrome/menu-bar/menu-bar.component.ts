import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { WorkbenchStore } from '../../state/workbench.store';
import { ShellUiStore } from '../../state/shell-ui.store';
import { NavigationService } from '../../services/navigation.service';
import { MenuDropdownComponent, type MenuAction } from './menu-dropdown.component';

/**
 * Top band (05 §2): brand ⚡ RWP2, File/View/Customer/Help custom dropdowns, a
 * centered command box (opens ⌘K), and a notifications bell.
 */
@Component({
  selector: 'rwp-menu-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MenuDropdownComponent],
  host: { class: 'block' },
  template: `
    <div
      class="flex h-full w-full items-center gap-1 px-2"
      style="background: var(--p-content-background); border-bottom: 1px solid var(--p-content-border-color)"
    >
      <span class="px-2 text-sm font-semibold" style="color: var(--p-text-color)">
        <span style="color: var(--p-primary-color)">⚡</span> RWP2
      </span>

      <rwp-menu-dropdown label="File" [items]="fileMenu()" />
      <rwp-menu-dropdown label="View" [items]="viewMenu()" />
      <rwp-menu-dropdown label="Customer" [items]="customerMenu()" />
      <rwp-menu-dropdown label="Help" [items]="helpMenu" />

      <div class="flex flex-1 justify-center px-6">
        <button
          type="button"
          class="flex w-full max-w-md items-center gap-2 rounded border px-3 py-1 text-xs"
          style="border-color: var(--p-content-border-color); color: var(--p-text-muted-color)"
          (click)="ui.openCommandCenter()"
        >
          <i class="pi pi-search text-[11px]"></i>
          <span>Search customers or run a command</span>
          <span class="ml-auto rounded px-1" style="background: var(--p-highlight-background)">⌘K</span>
        </button>
      </div>

      <button
        type="button"
        class="relative flex h-7 w-7 items-center justify-center rounded"
        style="color: var(--p-text-muted-color)"
        aria-label="Notifications"
      >
        <i class="pi pi-bell text-sm"></i>
      </button>
    </div>
  `,
})
export class MenuBarComponent {
  private readonly store = inject(WorkbenchStore);
  readonly ui = inject(ShellUiStore);
  private readonly nav = inject(NavigationService);

  readonly fileMenu = computed<MenuAction[]>(() => [
    { label: 'Preferences', icon: 'pi-cog', run: () => this.openPreferences() },
    { separator: true, label: '' },
    {
      label: 'Close tab',
      icon: 'pi-times',
      disabled: !this.store.activeTab()?.closeable,
      run: () => this.closeActive(),
    },
  ]);

  readonly viewMenu = computed<MenuAction[]>(() => [
    {
      label: this.ui.sidebarVisible() ? 'Hide sidebar' : 'Show sidebar',
      icon: 'pi-list',
      run: () => this.ui.sidebarVisible.update((v) => !v),
    },
    { label: 'Command Center…', icon: 'pi-search', run: () => this.ui.openCommandCenter() },
  ]);

  readonly customerMenu = computed<MenuAction[]>(() => {
    const recents = this.store.recents();
    const items: MenuAction[] = [
      { label: 'Open customer…', icon: 'pi-search', run: () => this.ui.openCommandCenter() },
    ];
    if (recents.length) {
      items.push({ separator: true, label: '' });
      for (const c of recents) {
        items.push({ label: `${c.name} (${c.trn})`, icon: 'pi-id-card', run: () => this.open(c.trn) });
      }
    }
    return items;
  });

  readonly helpMenu: MenuAction[] = [{ label: 'About RWP2', icon: 'pi-info-circle' }];

  private openPreferences(): void {
    void this.nav.openTarget({ appId: 'shell', path: '/preferences' });
  }

  private closeActive(): void {
    const id = this.store.activeTab()?.id;
    if (id) void this.nav.closeTab(id);
  }

  private open(trn: string): void {
    void this.nav.openCustomer(trn);
  }
}
