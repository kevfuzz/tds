import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { Prefs } from '@rwp2/contracts';
import { WorkbenchStore } from '../../state/workbench.store';
import { NavigationService } from '../../services/navigation.service';

/**
 * A shell-native screen (kind:'shell') — an ordinary Angular component, NOT a
 * webview (01 §3). Lazy-loaded by the content area. Reads prefs from the mirror
 * and writes changes through `wb:setPref`; the theme/density effect in
 * WorkbenchStore applies the visual change on the next frame.
 */
@Component({
  selector: 'rwp-preferences',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-2xl p-8" style="color: var(--p-text-color)">
      <h1 class="mb-6 text-lg font-semibold">Preferences</h1>

      @if (prefs(); as p) {
        <section class="flex flex-col gap-5">
          <label class="flex items-center justify-between">
            <span>Theme</span>
            <select
              class="rounded border px-2 py-1"
              style="background: var(--p-content-background); border-color: var(--p-content-border-color)"
              [value]="p.theme"
              (change)="set({ theme: asTheme($any($event.target).value) })"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </label>

          <label class="flex items-center justify-between">
            <span>Density</span>
            <select
              class="rounded border px-2 py-1"
              style="background: var(--p-content-background); border-color: var(--p-content-border-color)"
              [value]="p.density"
              (change)="set({ density: asDensity($any($event.target).value) })"
            >
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </label>

          <label class="flex items-center justify-between">
            <span>Group tabs by customer</span>
            <input
              type="checkbox"
              [checked]="p.groupTabsByCustomer"
              (change)="set({ groupTabsByCustomer: $any($event.target).checked })"
            />
          </label>

          <label class="flex items-center justify-between">
            <span>Always open a new tab</span>
            <input
              type="checkbox"
              [checked]="p.alwaysOpenNewTab"
              (change)="set({ alwaysOpenNewTab: $any($event.target).checked })"
            />
          </label>
        </section>
      }
    </div>
  `,
})
export class PreferencesComponent {
  private readonly store = inject(WorkbenchStore);
  private readonly nav = inject(NavigationService);

  readonly prefs = computed(() => this.store.prefs());

  set(patch: Partial<Prefs>): void {
    void this.nav.setPref(patch);
  }

  asTheme(v: string): Prefs['theme'] {
    return v === 'light' ? 'light' : 'dark';
  }
  asDensity(v: string): Prefs['density'] {
    return v === 'compact' ? 'compact' : 'comfortable';
  }
}
