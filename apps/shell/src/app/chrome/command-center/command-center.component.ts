import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import type { CustomerRef } from '@rwp2/contracts';
import { WorkbenchStore } from '../../state/workbench.store';
import { ShellUiStore } from '../../state/shell-ui.store';
import { NavigationService } from '../../services/navigation.service';

interface CommandItem {
  label: string;
  icon: string;
  run: () => void;
}

/**
 * ⌘K overlay (05 §2), opened via `wb:shortcut` (relayed into
 * `ShellUiStore.commandCenterOpen`). Default mode searches customers; a leading
 * `›` switches to command mode. It is a DOM overlay so it layers above webviews.
 * Selecting a result forwards to `NavigationService`.
 */
@Component({
  selector: 'rwp-command-center',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ui.commandCenterOpen()) {
      <div
        class="fixed inset-0 z-[100] flex justify-center pt-24"
        style="background: rgba(0, 0, 0, 0.4)"
        (click)="close()"
      >
        <div
          class="h-fit w-full max-w-xl overflow-hidden rounded-lg border shadow-2xl"
          style="background: var(--p-content-background); border-color: var(--p-content-border-color)"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center gap-2 border-b px-3 py-2" style="border-color: var(--p-content-border-color)">
            <i class="pi text-sm" [class.pi-angle-right]="commandMode()" [class.pi-search]="!commandMode()"
               style="color: var(--p-text-muted-color)"></i>
            <input
              #box
              class="w-full bg-transparent text-sm outline-none"
              style="color: var(--p-text-color)"
              placeholder="Search customers, or type › for commands"
              [value]="query()"
              (input)="query.set($any($event.target).value)"
              (keydown.escape)="close()"
            />
          </div>

          <ul class="max-h-80 overflow-y-auto py-1">
            @if (commandMode()) {
              @for (cmd of commands(); track cmd.label) {
                <li>
                  <button type="button" class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--p-highlight-background)]"
                          style="color: var(--p-text-color)" (click)="run(cmd)">
                    <i class="pi text-xs {{ cmd.icon }}"></i>{{ cmd.label }}
                  </button>
                </li>
              } @empty {
                <li class="px-3 py-2 text-xs" style="color: var(--p-text-muted-color)">No matching commands</li>
              }
            } @else {
              @for (c of customers(); track c.trn) {
                <li>
                  <button type="button" class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--p-highlight-background)]"
                          style="color: var(--p-text-color)" (click)="openCustomer(c)">
                    <i class="pi pi-id-card text-xs"></i>
                    <span>{{ c.name }}</span>
                    <span class="ml-auto text-xs" style="color: var(--p-text-muted-color)">{{ c.trn }}</span>
                  </button>
                </li>
              } @empty {
                <li class="px-3 py-2 text-xs" style="color: var(--p-text-muted-color)">No recent customers match</li>
              }
            }
          </ul>
        </div>
      </div>
    }
  `,
})
export class CommandCenterComponent {
  private readonly store = inject(WorkbenchStore);
  readonly ui = inject(ShellUiStore);
  private readonly nav = inject(NavigationService);
  private readonly box = viewChild<ElementRef<HTMLInputElement>>('box');

  readonly query = signal('');
  readonly commandMode = computed(() => this.query().trimStart().startsWith('›'));

  private readonly term = computed(() =>
    this.query().replace(/^\s*›?\s*/, '').toLowerCase(),
  );

  readonly customers = computed<CustomerRef[]>(() => {
    const t = this.term();
    return this.store
      .recents()
      .filter((c) => !t || c.name.toLowerCase().includes(t) || c.trn.toLowerCase().includes(t));
  });

  private readonly allCommands: CommandItem[] = [
    { label: 'Preferences', icon: 'pi-cog', run: () => this.nav.openTarget({ appId: 'shell', path: '/preferences' }) },
    { label: 'Toggle sidebar', icon: 'pi-list', run: () => this.ui.sidebarVisible.update((v) => !v) },
  ];

  readonly commands = computed<CommandItem[]>(() => {
    const t = this.term();
    return this.allCommands.filter((c) => !t || c.label.toLowerCase().includes(t));
  });

  constructor() {
    effect(() => {
      if (this.ui.commandCenterOpen()) {
        this.query.set('');
        queueMicrotask(() => this.box()?.nativeElement.focus());
      }
    });
  }

  openCustomer(c: CustomerRef): void {
    void this.nav.openCustomer(c.trn);
    this.close();
  }

  run(cmd: CommandItem): void {
    cmd.run();
    this.close();
  }

  close(): void {
    this.ui.closeCommandCenter();
  }
}
