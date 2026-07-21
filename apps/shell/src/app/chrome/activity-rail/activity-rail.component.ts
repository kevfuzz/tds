import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ShellUiStore, type ActivityPanel } from '../../state/shell-ui.store';

interface RailItem {
  panel: ActivityPanel;
  icon: string;
  label: string;
}

/**
 * Activity rail (05 §2): explorer / search / queues / favourites / apps + a
 * settings cog. A 3px emerald bar marks the active panel. Selection drives the
 * sidebar via `ShellUiStore` (ephemeral, shell-only view state).
 */
@Component({
  selector: 'rwp-activity-rail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <nav
      class="flex h-full flex-col items-center py-1"
      style="width: 48px; background: var(--p-content-background); border-right: 1px solid var(--p-content-border-color)"
    >
      @for (item of items; track item.panel) {
        <button
          type="button"
          class="relative flex h-11 w-full items-center justify-center"
          [attr.aria-label]="item.label"
          [attr.aria-pressed]="isActive(item.panel)"
          [style.color]="isActive(item.panel) ? 'var(--p-text-color)' : 'var(--p-text-muted-color)'"
          (click)="ui.selectPanel(item.panel)"
        >
          @if (isActive(item.panel)) {
            <span
              class="absolute left-0 top-1/2 h-6 -translate-y-1/2"
              style="width: 3px; background: var(--p-primary-color)"
            ></span>
          }
          <i class="pi text-lg {{ item.icon }}"></i>
        </button>
      }

      <span class="flex-1"></span>

      <button
        type="button"
        class="flex h-11 w-full items-center justify-center"
        style="color: var(--p-text-muted-color)"
        aria-label="Settings"
        (click)="openSettings()"
      >
        <i class="pi pi-cog text-lg"></i>
      </button>
    </nav>
  `,
})
export class ActivityRailComponent {
  readonly ui = inject(ShellUiStore);

  readonly items: RailItem[] = [
    { panel: 'explorer', icon: 'pi-folder', label: 'Explorer' },
    { panel: 'search', icon: 'pi-search', label: 'Search' },
    { panel: 'queues', icon: 'pi-inbox', label: 'Queues' },
    { panel: 'favourites', icon: 'pi-star', label: 'Favourites' },
    { panel: 'apps', icon: 'pi-th-large', label: 'Apps' },
  ];

  isActive(panel: ActivityPanel): boolean {
    return this.ui.activePanel() === panel && this.ui.sidebarVisible();
  }

  openSettings(): void {
    this.ui.selectPanel('apps');
  }
}
