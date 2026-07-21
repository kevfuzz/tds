import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Workbench } from '@rwp2/sdk';
import type { MenuNode } from '@rwp2/contracts';
import { RwpTag } from '@rwp2/ui';

interface QueueItem {
  id: string;
  label: string;
  trn: string;
  age: string;
}

/**
 * My queue — lists the caseworker's open items. Demonstrates contributeMenu:
 * the running instance surfaces its own in-progress work into the shell sidebar
 * (things only a live instance knows — everything predictable stays in the manifest).
 */
@Component({
  selector: 'app-my-queue',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, RwpTag],
  template: `
    <section class="screen">
      <header class="screen__head">
        <h1>My queue</h1>
        <p-button label="Add to sidebar" icon="pi pi-bookmark" size="small" (onClick)="contribute()" />
      </header>

      <ul class="queue">
        @for (item of items(); track item.id) {
          <li class="queue__row">
            <span class="queue__label">{{ item.label }}</span>
            <rwp-tag [label]="item.trn" />
            <span class="queue__age">{{ item.age }}</span>
          </li>
        } @empty {
          <li class="queue__empty">Your queue is clear.</li>
        }
      </ul>
    </section>
  `,
  styles: [
    `
      .screen { display: flex; flex-direction: column; gap: 1rem; padding: 1.5rem; }
      .screen__head { display: flex; align-items: center; justify-content: space-between; }
      .screen__head h1 { margin: 0; font-size: 1.25rem; }
      .queue { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
      .queue__row { display: flex; align-items: center; gap: 0.75rem; }
      .queue__age { margin-left: auto; color: var(--p-text-muted-color); }
    `,
  ],
})
export class MyQueueScreen {
  private readonly wb = inject(Workbench);

  readonly items = signal<QueueItem[]>([
    { id: 'q-8841', label: 'VAT review — Byrne Logistics', trn: '3287645T', age: '2d' },
    { id: 'q-8850', label: 'CT return follow-up — Nolan Foods', trn: '4419203K', age: '5h' },
  ]);

  /** Push the live open items into the shell sidebar as a contributed menu group. */
  contribute(): void {
    const nodes: MenuNode[] = this.items().map((item, index) => ({
      id: item.id,
      label: item.label,
      icon: 'pi pi-inbox',
      group: 'registrations',
      order: index,
      badge: 'open',
      target: {
        appId: 'work-queues',
        path: '/my-queue',
        customer: { trn: item.trn, name: item.label, type: 'Company' },
      },
    }));
    this.wb.contributeMenu(nodes);
    this.wb.notify({ severity: 'info', summary: 'Queue pinned', detail: `${nodes.length} open items` });
  }
}
