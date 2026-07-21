import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface KeyValueItem {
  key: string;
  value: string;
  /** Optional PrimeIcon class shown before the value. */
  icon?: string;
}

/**
 * A titled card rendering a list of key/value rows — the workhorse for customer
 * summaries, registration details, etc. Dumb, presentational (02 §4). Pass rows
 * via `items`; project extra content (buttons, tags) into the header slot.
 */
@Component({
  selector: 'rwp-key-value-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rwp-kv">
      <header class="rwp-kv__header">
        <h3 class="rwp-kv__title">{{ title() }}</h3>
        <ng-content select="[card-actions]" />
      </header>
      <dl class="rwp-kv__list">
        @for (item of items(); track item.key) {
          <div class="rwp-kv__row">
            <dt class="rwp-kv__key">{{ item.key }}</dt>
            <dd class="rwp-kv__value">
              @if (item.icon) {
                <i [class]="item.icon" aria-hidden="true"></i>
              }
              {{ item.value }}
            </dd>
          </div>
        } @empty {
          <p class="rwp-kv__empty">No details.</p>
        }
      </dl>
    </section>
  `,
  styles: [
    `
      .rwp-kv {
        background: var(--p-surface-card);
        border: 1px solid var(--p-surface-border);
        border-radius: 0.5rem;
        padding: var(--p-density-padding-y, 0.625rem) var(--p-density-padding-x, 0.875rem);
        color: var(--p-text-color);
      }
      .rwp-kv__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
      }
      .rwp-kv__title {
        margin: 0;
        font-size: 0.9375rem;
        font-weight: 600;
      }
      .rwp-kv__list {
        margin: 0;
        display: grid;
        gap: var(--p-density-gap, 0.5rem);
      }
      .rwp-kv__row {
        display: grid;
        grid-template-columns: minmax(6rem, 40%) 1fr;
        gap: 0.75rem;
        align-items: baseline;
      }
      .rwp-kv__key {
        color: var(--p-text-muted-color);
        font-size: 0.8125rem;
      }
      .rwp-kv__value {
        margin: 0;
        font-size: var(--p-density-font-size, 0.9375rem);
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
      }
      .rwp-kv__empty {
        margin: 0;
        color: var(--p-text-muted-color);
        font-size: 0.875rem;
      }
    `,
  ],
})
export class KeyValueCard {
  readonly title = input.required<string>();
  readonly items = input<readonly KeyValueItem[]>([]);
}
