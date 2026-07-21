import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Workbench } from '@rwp2/sdk';
import { RwpEmptyState, RwpKeyValueCard, RwpTag } from '@rwp2/ui';

/**
 * Overview — the landing screen. Demonstrates every content-app touchpoint once:
 * reads the live customer context, an EmptyState when there is none, a setDirty
 * demo paired with a close guard, and a cross-app navigate() to the forms app.
 */
@Component({
  selector: 'app-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, RwpEmptyState, RwpKeyValueCard, RwpTag],
  template: `
    @if (customer(); as c) {
      <section class="screen">
        <header class="screen__head">
          <h1>{{ c.name }}</h1>
          <rwp-tag [label]="c.type" />
        </header>

        <rwp-key-value-card
          heading="Registration"
          [items]="[
            { key: 'TRN', value: c.trn },
            { key: 'Type', value: c.type },
            { key: 'Persona', value: persona() }
          ]"
        />

        <!-- DEMO: dirty tracking. Toggling flips the tab ● dot; the close guard
             below vetoes closing the tab while this screen reports unsaved input. -->
        <div class="screen__actions">
          <p-button
            [label]="dirty() ? 'Discard changes' : 'Edit (mark dirty)'"
            [severity]="dirty() ? 'secondary' : 'primary'"
            (onClick)="toggleDirty()"
          />
          <!-- DEMO: open a screen in ANOTHER app — never link its URL directly. -->
          <p-button label="Start VAT3 return" icon="pi pi-arrow-up-right" (onClick)="openVat3()" />
        </div>
      </section>
    } @else {
      <rwp-empty-state
        icon="pi pi-id-card"
        heading="No customer selected"
        message="Open a customer from the workbench to see their registration overview."
      />
    }
  `,
  styles: [
    `
      .screen { display: flex; flex-direction: column; gap: 1rem; padding: 1.5rem; }
      .screen__head { display: flex; align-items: center; gap: 0.75rem; }
      .screen__head h1 { margin: 0; font-size: 1.25rem; }
      .screen__actions { display: flex; gap: 0.75rem; }
    `,
  ],
})
export class OverviewScreen {
  private readonly wb = inject(Workbench);
  private readonly destroyRef = inject(DestroyRef);

  /** Live workbench context — updates when the shell changes the open customer. */
  readonly customer = computed(() => this.wb.context().customer);
  readonly persona = computed(() => this.wb.context().persona);
  readonly dirty = signal(false);

  constructor() {
    // Veto tab close while dirty; the shell shows a confirm before honouring it.
    const unregister = this.wb.registerCloseGuard(() => !this.dirty());
    this.destroyRef.onDestroy(unregister);
  }

  toggleDirty(): void {
    const next = !this.dirty();
    this.dirty.set(next);
    this.wb.setDirty(next);
  }

  openVat3(): void {
    void this.wb.navigate({
      appId: 'forms',
      path: '/vat3',
      customer: this.customer() ?? undefined,
    });
  }
}
