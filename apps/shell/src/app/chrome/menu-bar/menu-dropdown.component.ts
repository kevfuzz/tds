import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

export interface MenuAction {
  label: string;
  icon?: string;
  run?: () => void;
  separator?: boolean;
  disabled?: boolean;
}

/**
 * A custom dropdown (NOT PrimeNG Menubar, per 05 §2). Its panel is a DOM overlay
 * so it layers above webviews correctly (the point of D1). Closes on outside
 * click or Escape.
 */
@Component({
  selector: 'rwp-menu-dropdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative">
      <button
        type="button"
        class="h-full px-2 text-xs"
        [style.background]="open() ? 'var(--p-highlight-background)' : 'transparent'"
        style="color: var(--p-text-color)"
        (click)="toggle($event)"
      >
        {{ label() }}
      </button>

      @if (open()) {
        <ul
          class="absolute left-0 top-full z-50 mt-0.5 min-w-48 rounded border py-1 shadow-lg"
          style="background: var(--p-content-background); border-color: var(--p-content-border-color)"
        >
          @for (item of items(); track $index) {
            @if (item.separator) {
              <li class="my-1 border-t" style="border-color: var(--p-content-border-color)"></li>
            } @else {
              <li>
                <button
                  type="button"
                  class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-[var(--p-highlight-background)] disabled:opacity-40"
                  style="color: var(--p-text-color)"
                  [disabled]="item.disabled"
                  (click)="choose(item)"
                >
                  <i class="pi w-3 text-[11px] {{ item.icon || '' }}"></i>
                  <span>{{ item.label }}</span>
                </button>
              </li>
            }
          }
        </ul>
      }
    </div>
  `,
})
export class MenuDropdownComponent {
  readonly label = input.required<string>();
  readonly items = input.required<MenuAction[]>();

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly _open = signal(false);
  readonly open = computed(() => this._open());

  toggle(ev: Event): void {
    ev.stopPropagation();
    this._open.update((v) => !v);
  }

  choose(item: MenuAction): void {
    if (item.disabled) return;
    this._open.set(false);
    item.run?.();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent): void {
    if (!this.host.nativeElement.contains(ev.target as Node)) this._open.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this._open.set(false);
  }
}
