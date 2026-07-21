import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type CrashKind = 'crashed' | 'load-failed';

/**
 * Crash & failure card shown in a single tab (05 §5). Shell and sibling tabs
 * are unaffected — this replaces one webview's body only. Reload calls back into
 * the owning host (`WebviewContentHost.reload`).
 */
@Component({
  selector: 'rwp-crash-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex h-full w-full flex-col items-center justify-center gap-3 p-8 text-center"
      style="background: var(--p-content-background); color: var(--p-text-color)"
    >
      <i
        class="pi text-4xl"
        [class.pi-exclamation-triangle]="kind() === 'crashed'"
        [class.pi-wifi]="kind() === 'load-failed'"
        style="color: var(--p-orange-400)"
      ></i>

      <h2 class="text-base font-semibold">
        @if (kind() === 'crashed') {
          This screen stopped responding
        } @else {
          Couldn't reach {{ appName() }}
        }
      </h2>

      <p class="max-w-md text-sm" style="color: var(--p-text-muted-color)">
        <span class="font-medium">{{ appName() }}</span>
        @if (reason()) {
          — {{ reason() }}
        }
        @if (kind() === 'load-failed') {
          <br />Check service status, then reload.
        }
      </p>

      <button
        type="button"
        class="mt-2 rounded px-4 py-1.5 text-sm font-medium"
        style="background: var(--p-primary-color); color: var(--p-primary-contrast-color)"
        (click)="reload.emit()"
      >
        Reload
      </button>
    </div>
  `,
})
export class CrashCardComponent {
  readonly kind = input.required<CrashKind>();
  readonly appName = input.required<string>();
  readonly reason = input<string | undefined>();
  readonly reload = output<void>();
}
