import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { AppRuntimeInfo } from '@rwp2/contracts';
import { WorkbenchStore } from '../../../state/workbench.store';
import { NavigationService } from '../../../services/navigation.service';
import { MenuTreeNodeComponent } from './menu-tree-node.component';

/**
 * Explorer panel body: renders the merged `MenuNode[]` from the mirror as the
 * customer tree, plus a quiet per-app retry row for any app whose per-customer
 * REST menu fetch failed (`menuStatus:'failed'` → `wb:refreshAppMenu`, 05 §2).
 */
@Component({
  selector: 'rwp-menu-tree',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MenuTreeNodeComponent],
  template: `
    <div class="flex flex-col gap-0.5 overflow-y-auto p-1">
      @for (node of menu(); track node.id) {
        <rwp-menu-tree-node [node]="node" />
      } @empty {
        <p class="px-2 py-3 text-xs" style="color: var(--p-text-muted-color)">
          Open a customer to see their records.
        </p>
      }

      @for (app of failedApps(); track app.manifest.id) {
        <div
          class="mx-1 mt-1 flex items-center gap-2 rounded px-2 py-1 text-xs"
          style="color: var(--p-text-muted-color); background: var(--p-content-background)"
        >
          <i class="pi pi-exclamation-circle text-[11px]" style="color: var(--p-orange-400)"></i>
          <span class="truncate">{{ app.manifest.name }} menu unavailable</span>
          <button
            type="button"
            class="ml-auto underline"
            (click)="retry(app)"
          >
            Retry
          </button>
        </div>
      }
    </div>
  `,
})
export class MenuTreeComponent {
  private readonly store = inject(WorkbenchStore);
  private readonly nav = inject(NavigationService);

  readonly menu = this.store.menu;
  readonly failedApps = computed<AppRuntimeInfo[]>(() =>
    this.store.apps().filter((a) => a.menuStatus === 'failed'),
  );

  retry(app: AppRuntimeInfo): void {
    void this.nav.refreshAppMenu(app.manifest.id);
  }
}
