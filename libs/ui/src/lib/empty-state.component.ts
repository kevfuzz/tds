import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

/**
 * Placeholder for "nothing here yet" / "no results" areas. Dumb, presentational
 * (02 §4). Optional action button emits `action`; projected content renders
 * below the message for richer cases.
 */
@Component({
  selector: 'rwp-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rwp-empty" role="status">
      <i class="rwp-empty__icon" [class]="icon()" aria-hidden="true"></i>
      <h3 class="rwp-empty__title">{{ heading() }}</h3>
      @if (message()) {
        <p class="rwp-empty__message">{{ message() }}</p>
      }
      <ng-content />
      @if (actionLabel()) {
        <button type="button" class="rwp-empty__action" (click)="action.emit()">
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
  styles: [
    `
      .rwp-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        gap: 0.5rem;
        padding: 2.5rem 1.5rem;
        color: var(--p-text-muted-color);
      }
      .rwp-empty__icon {
        font-size: 2.25rem;
        color: var(--p-surface-400);
        margin-bottom: 0.25rem;
      }
      .rwp-empty__title {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--p-text-color);
      }
      .rwp-empty__message {
        margin: 0;
        max-width: 32rem;
        font-size: 0.875rem;
      }
      .rwp-empty__action {
        margin-top: 0.75rem;
        padding: 0.4rem 0.9rem;
        border-radius: 0.375rem;
        border: 1px solid var(--p-primary-color);
        background: var(--p-primary-color);
        color: var(--p-primary-contrast-color);
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
      }
      .rwp-empty__action:hover {
        background: var(--p-primary-hover-color);
        border-color: var(--p-primary-hover-color);
      }
    `,
  ],
})
export class EmptyState {
  /** Leading PrimeIcon class, e.g. 'pi pi-inbox'. */
  readonly icon = input<string>('pi pi-inbox');
  readonly heading = input.required<string>();
  readonly message = input<string | null>(null);
  /** When set, renders a primary action button. */
  readonly actionLabel = input<string | null>(null);

  readonly action = output<void>();
}
