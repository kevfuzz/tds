import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import type { MenuNode } from '@rwp2/contracts';
import { NavigationService } from '../../../services/navigation.service';

/**
 * One node of the merged customer tree (05 §2). Group nodes (no `target`, or
 * with children) expand/collapse; leaf nodes navigate via their `target`. The
 * component recurses into itself for children.
 */
@Component({
  selector: 'rwp-menu-tree-node',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (node(); as n) {
      <div
        class="flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-sm hover:bg-[var(--p-highlight-background)]"
        [style.padding-left.px]="8 + depth() * 12"
        [style.color]="'var(--p-text-color)'"
        (click)="onClick()"
      >
        @if (isGroup()) {
          <i class="pi text-[10px]" [class.pi-chevron-down]="open()" [class.pi-chevron-right]="!open()"></i>
        } @else {
          <i class="pi text-[11px] {{ n.icon || 'pi-file' }}"></i>
        }
        <span class="truncate">{{ n.label }}</span>
        @if (n.badge) {
          <span
            class="ml-auto rounded px-1 text-[10px]"
            style="background: var(--p-primary-color); color: var(--p-primary-contrast-color)"
            >{{ n.badge }}</span
          >
        }
      </div>

      @if (isGroup() && open()) {
        @for (child of n.children ?? []; track child.id) {
          <rwp-menu-tree-node [node]="child" [depth]="depth() + 1" />
        }
      }
    }
  `,
})
export class MenuTreeNodeComponent {
  readonly node = input.required<MenuNode>();
  readonly depth = input<number>(0);

  private readonly nav = inject(NavigationService);
  private readonly _open = signal(true);
  readonly open = this._open.asReadonly();

  readonly isGroup = computed(() => {
    const n = this.node();
    return !n.target || (n.children?.length ?? 0) > 0;
  });

  onClick(): void {
    const n = this.node();
    if (this.isGroup()) {
      this._open.update((v) => !v);
      return;
    }
    if (n.target) void this.nav.openTarget(n.target);
  }
}
