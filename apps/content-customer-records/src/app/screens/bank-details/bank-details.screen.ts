import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Workbench } from '@rwp2/sdk';
import { RwpEmptyState, RwpKeyValueCard } from '@rwp2/ui';

/**
 * Bank details — a financials screen. Reads the same live customer context; all
 * REST would be relative (`/api/customer-records/...`) and proxied in dev.
 */
@Component({
  selector: 'app-bank-details',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RwpEmptyState, RwpKeyValueCard],
  template: `
    @if (customer(); as c) {
      <section class="screen">
        <h1>Bank details</h1>
        <rwp-key-value-card
          heading="Refund account"
          [items]="[
            { key: 'Account holder', value: c.name },
            { key: 'IBAN', value: 'IE29 AIBK 9311 5212 3456 78' },
            { key: 'BIC', value: 'AIBKIE2D' }
          ]"
        />
      </section>
    } @else {
      <rwp-empty-state
        icon="pi pi-wallet"
        heading="No customer selected"
        message="Open a customer to view their financial details."
      />
    }
  `,
  styles: [`.screen { display: flex; flex-direction: column; gap: 1rem; padding: 1.5rem; }`],
})
export class BankDetailsScreen {
  private readonly wb = inject(Workbench);
  readonly customer = computed(() => this.wb.context().customer);
}
