import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { TabDescriptor } from '@rwp2/contracts';
import { WorkbenchStore } from '../../state/workbench.store';
import { NavigationService } from '../../services/navigation.service';

/**
 * Tab strip (05 §2): renders `TabDescriptor[]` with icon, label, dirty ● and
 * close ×. When `prefs.groupTabsByCustomer` is on, tabs are shown under a
 * customer chip. Drag-reorder posts `wb:reorderTabs`; main re-emits the order.
 */
@Component({
  selector: 'rwp-tab-strip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div
      class="flex h-full w-full items-stretch overflow-x-auto"
      style="background: var(--p-content-background); border-bottom: 1px solid var(--p-content-border-color)"
    >
      @for (group of groups(); track group.key) {
        @if (group.chip) {
          <span
            class="flex items-center px-2 text-[10px] font-semibold uppercase tracking-wide"
            style="color: var(--p-text-muted-color)"
          >
            <i class="pi pi-id-card mr-1 text-[10px]"></i>{{ group.chip }}
          </span>
        }
        @for (tab of group.tabs; track tab.id) {
          <div
            class="group flex max-w-52 cursor-pointer select-none items-center gap-2 border-r px-3 text-xs"
            style="border-color: var(--p-content-border-color)"
            [style.background]="tab.id === activeId() ? 'var(--p-highlight-background)' : 'transparent'"
            [style.color]="tab.id === activeId() ? 'var(--p-text-color)' : 'var(--p-text-muted-color)'"
            draggable="true"
            (click)="activate(tab)"
            (dragstart)="onDragStart(tab.id)"
            (dragover)="$event.preventDefault()"
            (drop)="onDrop(tab.id)"
          >
            <i class="pi text-[11px] {{ tab.icon }}"></i>
            <span class="truncate">{{ tab.shortLabel || tab.label }}</span>
            @if (tab.dirty) {
              <span style="color: var(--p-primary-color)">●</span>
            }
            @if (tab.closeable) {
              <button
                type="button"
                class="opacity-0 group-hover:opacity-100"
                aria-label="Close tab"
                (click)="close(tab, $event)"
              >
                <i class="pi pi-times text-[11px]"></i>
              </button>
            }
          </div>
        }
      }
    </div>
  `,
})
export class TabStripComponent {
  private readonly store = inject(WorkbenchStore);
  private readonly nav = inject(NavigationService);

  readonly activeId = this.store.activeTabId;
  private readonly dragging = signal<string | null>(null);

  /** Tabs, optionally partitioned into customer-chip groups per prefs. */
  readonly groups = computed(() => {
    const tabs = this.store.tabs();
    if (!this.store.prefs()?.groupTabsByCustomer) {
      return [{ key: 'all', chip: null as string | null, tabs }];
    }
    const byCustomer = new Map<string, TabDescriptor[]>();
    for (const t of tabs) {
      const key = t.customerTrn ?? '—';
      (byCustomer.get(key) ?? byCustomer.set(key, []).get(key)!).push(t);
    }
    return [...byCustomer.entries()].map(([key, groupTabs]) => ({
      key,
      chip: key === '—' ? null : key,
      tabs: groupTabs,
    }));
  });

  activate(tab: TabDescriptor): void {
    if (tab.id !== this.activeId()) void this.nav.activateTab(tab.id);
  }

  close(tab: TabDescriptor, ev: Event): void {
    ev.stopPropagation();
    void this.nav.closeTab(tab.id);
  }

  onDragStart(id: string): void {
    this.dragging.set(id);
  }

  onDrop(targetId: string): void {
    const from = this.dragging();
    this.dragging.set(null);
    if (!from || from === targetId) return;
    const ids = this.store.tabs().map((t) => t.id);
    const next = ids.filter((id) => id !== from);
    next.splice(next.indexOf(targetId), 0, from);
    void this.nav.reorderTabs(next);
  }
}
