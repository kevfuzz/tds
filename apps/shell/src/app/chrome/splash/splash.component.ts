import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Shown while `state() === null` — the auth → registry → manifest boot window
 * (01 §7, 05 §2). Replaced in one frame by the full chrome once main's first
 * `wb:getState` resolves.
 */
@Component({
  selector: 'rwp-splash',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex h-full w-full flex-col items-center justify-center gap-4"
      style="background: var(--p-content-background); color: var(--p-text-color)"
    >
      <div class="text-2xl font-semibold tracking-tight">
        <span style="color: var(--p-primary-color)">⚡</span> RWP2
      </div>
      <div
        class="h-1 w-40 overflow-hidden rounded"
        style="background: var(--p-content-border-color)"
      >
        <div class="rwp-indeterminate h-full w-1/3" style="background: var(--p-primary-color)"></div>
      </div>
      <p class="text-sm" style="color: var(--p-text-muted-color)">Signing you in…</p>
    </div>
  `,
  styles: [
    `
      @keyframes rwp-slide {
        0% { transform: translateX(-120%); }
        100% { transform: translateX(420%); }
      }
      .rwp-indeterminate {
        animation: rwp-slide 1.1s ease-in-out infinite;
      }
    `,
  ],
})
export class SplashComponent {}
