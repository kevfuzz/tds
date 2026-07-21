import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { WorkbenchStore } from '../../state/workbench.store';
import { NavigationService } from '../../services/navigation.service';

/**
 * Emerald status band (05 §2): brand · user name · persona switcher
 * (`wb:setPref`) · active customer · Ready. All reads are from the mirror.
 */
@Component({
  selector: 'rwp-status-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div
      class="flex h-full w-full items-center gap-4 px-3 text-xs font-medium"
      style="background: var(--p-primary-color); color: var(--p-primary-contrast-color)"
    >
      <span class="font-semibold">⚡ RWP2</span>

      @if (user(); as u) {
        <span class="opacity-90"><i class="pi pi-user text-[10px]"></i> {{ u.name }}</span>
      }

      <label class="flex items-center gap-1 opacity-90">
        <span>Persona:</span>
        <select
          class="rounded bg-transparent px-1 py-0.5 text-xs"
          style="color: var(--p-primary-contrast-color)"
          [value]="persona()"
          (change)="switchPersona($any($event.target).value)"
        >
          @for (r of personas(); track r) {
            <option [value]="r" style="color: var(--p-text-color)">{{ r }}</option>
          }
        </select>
      </label>

      <span class="flex-1"></span>

      @if (customer(); as c) {
        <span class="opacity-90"><i class="pi pi-id-card text-[10px]"></i> {{ c.name }} ({{ c.trn }})</span>
      }
      <span class="flex items-center gap-1">
        <i class="pi pi-check-circle text-[10px]"></i> Ready
      </span>
    </div>
  `,
})
export class StatusBarComponent {
  private readonly store = inject(WorkbenchStore);
  private readonly nav = inject(NavigationService);

  readonly user = this.store.user;
  readonly customer = computed(() => this.store.context()?.customer ?? null);
  readonly persona = computed(() => this.store.prefs()?.persona ?? '');
  readonly personas = computed(() => this.store.user()?.roles ?? []);

  switchPersona(persona: string): void {
    void this.nav.setPref({ persona });
  }
}
