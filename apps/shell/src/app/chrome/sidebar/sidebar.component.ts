import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { WorkbenchStore } from '../../state/workbench.store';
import { ShellUiStore } from '../../state/shell-ui.store';
import { MenuTreeComponent } from './explorer-menu-tree/menu-tree.component';

/**
 * Sidebar (05 §2): a header naming the active panel + the panel body. The
 * explorer panel renders the merged menu tree; other panels are placeholders in
 * v1. Fixed 264px; only its inner body scrolls (the shell never does).
 */
@Component({
  selector: 'rwp-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MenuTreeComponent],
  host: { class: 'block h-full' },
  template: `
    <aside
      class="flex h-full flex-col"
      style="background: var(--p-content-background); border-right: 1px solid var(--p-content-border-color)"
    >
      <header
        class="flex shrink-0 items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wide"
        style="color: var(--p-text-muted-color)"
      >
        <span>{{ title() }}</span>
        @if (customer(); as c) {
          <span class="truncate normal-case" style="color: var(--p-text-color)">{{ c.name }}</span>
        }
      </header>

      <div class="min-h-0 flex-1 overflow-hidden">
        @switch (ui.activePanel()) {
          @case ('explorer') {
            <rwp-menu-tree />
          }
          @default {
            <p class="px-3 py-4 text-xs" style="color: var(--p-text-muted-color)">
              {{ title() }} — coming soon.
            </p>
          }
        }
      </div>
    </aside>
  `,
})
export class SidebarComponent {
  private readonly store = inject(WorkbenchStore);
  readonly ui = inject(ShellUiStore);

  readonly customer = computed(() => this.store.context()?.customer ?? null);
  readonly title = computed(() => {
    const labels: Record<string, string> = {
      explorer: 'Explorer',
      search: 'Search',
      queues: 'Queues',
      favourites: 'Favourites',
      apps: 'Apps',
    };
    return labels[this.ui.activePanel()] ?? 'Explorer';
  });
}
