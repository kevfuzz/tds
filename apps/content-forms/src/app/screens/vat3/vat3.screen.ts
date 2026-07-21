import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Workbench } from '@rwp2/sdk';
import { RwpEmptyState } from '@rwp2/ui';

/**
 * VAT3 return — the landing target for the reference app's cross-app navigate().
 * Editable screen: any input marks the workbench dirty, and a close guard vetoes
 * closing the tab while the return is unsaved.
 */
@Component({
  selector: 'app-vat3',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonModule, InputTextModule, RwpEmptyState],
  template: `
    @if (customer(); as c) {
      <form class="screen" (ngSubmit)="save()">
        <h1>VAT3 return — {{ c.name }}</h1>

        <label class="field">
          <span>T1 — VAT on sales</span>
          <input pInputText inputmode="decimal" [ngModel]="t1()" name="t1" (ngModelChange)="onEdit($event)" />
        </label>

        <div class="screen__actions">
          <p-button type="submit" label="Save return" [disabled]="!dirty()" />
        </div>
      </form>
    } @else {
      <rwp-empty-state
        icon="pi pi-file-edit"
        heading="No customer selected"
        message="Open a customer to file a VAT3 return."
      />
    }
  `,
  styles: [
    `
      .screen { display: flex; flex-direction: column; gap: 1rem; padding: 1.5rem; max-width: 32rem; }
      .field { display: flex; flex-direction: column; gap: 0.25rem; }
    `,
  ],
})
export class Vat3Screen {
  private readonly wb = inject(Workbench);
  private readonly destroyRef = inject(DestroyRef);

  readonly customer = computed(() => this.wb.context().customer);
  readonly t1 = signal('');
  readonly dirty = signal(false);

  constructor() {
    const unregister = this.wb.registerCloseGuard(() => !this.dirty());
    this.destroyRef.onDestroy(unregister);
  }

  onEdit(value: string): void {
    this.t1.set(value);
    if (!this.dirty()) {
      this.dirty.set(true);
      this.wb.setDirty(true); // unsaved input → tab shows the ● dot
    }
  }

  save(): void {
    // POST /api/forms/vat3 (relative, proxied) would go here.
    this.dirty.set(false);
    this.wb.setDirty(false);
    this.wb.notify({ severity: 'info', summary: 'VAT3 saved' });
  }
}
