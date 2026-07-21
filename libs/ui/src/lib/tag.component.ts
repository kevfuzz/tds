import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type TagSeverity = 'neutral' | 'info' | 'success' | 'warn' | 'error';

/**
 * Small status pill. Dumb, presentational (02 §4): OnPush + signal inputs, no
 * services. Colours resolve to the @rwp2/ui tokens so it follows the shell theme.
 */
@Component({
  selector: 'rwp-tag',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="rwp-tag" [class]="'rwp-tag--' + severity()">
      @if (icon()) {
        <i [class]="icon()" aria-hidden="true"></i>
      }
      <span class="rwp-tag__label">{{ label() }}</span>
    </span>
  `,
  styles: [
    `
      .rwp-tag {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.125rem 0.5rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
        line-height: 1.25;
        border: 1px solid transparent;
        white-space: nowrap;
      }
      .rwp-tag i {
        font-size: 0.75rem;
      }
      .rwp-tag--neutral {
        background: var(--p-surface-hover);
        color: var(--p-text-color);
        border-color: var(--p-surface-border);
      }
      .rwp-tag--info {
        background: color-mix(in srgb, #3b82f6 16%, transparent);
        color: #93c5fd;
      }
      .rwp-tag--success {
        background: color-mix(in srgb, var(--p-primary-500) 16%, transparent);
        color: var(--p-primary-300);
      }
      .rwp-tag--warn {
        background: color-mix(in srgb, #f59e0b 18%, transparent);
        color: #fcd34d;
      }
      .rwp-tag--error {
        background: color-mix(in srgb, #ef4444 18%, transparent);
        color: #fca5a5;
      }
    `,
  ],
})
export class Tag {
  readonly label = input.required<string>();
  readonly severity = input<TagSeverity>('neutral');
  /** Optional leading PrimeIcon class, e.g. 'pi pi-check'. */
  readonly icon = input<string | null>(null);

  /** Exposed for tests / templates that want the resolved class. */
  readonly cssClass = computed(() => `rwp-tag rwp-tag--${this.severity()}`);
}
