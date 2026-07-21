import { Injectable, computed, effect, inject, signal } from '@angular/core';
import type {
  AppRuntimeInfo,
  CurrentUser,
  CustomerRef,
  MenuNode,
  Prefs,
  TabDescriptor,
  WorkbenchContext,
  WorkbenchState,
} from '@rwp2/contracts';
import { HostService } from '../services/host.service';

/**
 * Signal mirror of the authoritative state that lives in main (01 §4, 05 §1).
 * The shell holds NO authoritative state: it seeds from `wb:getState`, then
 * applies `wb:stateChanged` patches. Chrome components read the computeds and
 * mutate nothing that main owns.
 */
@Injectable({ providedIn: 'root' })
export class WorkbenchStore {
  private readonly _state = signal<WorkbenchState | null>(null); // null = splash

  readonly state = this._state.asReadonly();
  readonly tabs = computed<TabDescriptor[]>(() => this._state()?.tabs ?? []);
  readonly activeTab = computed<TabDescriptor | null>(
    () => this.tabs().find((t) => t.id === this._state()?.activeTabId) ?? null,
  );
  readonly activeTabId = computed<string | null>(() => this._state()?.activeTabId ?? null);
  readonly menu = computed<MenuNode[]>(() => this._state()?.menu ?? []);
  readonly apps = computed<AppRuntimeInfo[]>(() => this._state()?.apps ?? []);
  readonly user = computed<CurrentUser | null>(() => this._state()?.user ?? null);
  readonly context = computed<WorkbenchContext | null>(() => this._state()?.context ?? null);
  readonly prefs = computed<Prefs | null>(() => this._state()?.prefs ?? null);
  readonly recents = computed<CustomerRef[]>(() => this._state()?.recents ?? []);
  readonly favourites = computed<string[]>(() => this._state()?.favourites ?? []);

  constructor() {
    const host = inject(HostService);
    if (host.available) {
      host.invoke('wb:getState', undefined).then((s) => this._state.set(s));
      host.on('wb:stateChanged', (patch) =>
        this._state.update((s) => (s ? { ...s, ...patch } : s)),
      );
    }

    // Theme/density: one effect, one frame, no reload (05 §1).
    effect(() => this.applyAppearance(this.prefs()));
  }

  private applyAppearance(prefs: Prefs | null): void {
    if (!prefs || typeof document === 'undefined') return;
    const root = document.documentElement;
    const dark = prefs.theme === 'dark';
    root.classList.toggle('app-dark', dark);
    root.classList.toggle('light', !dark);
    root.classList.toggle('density-compact', prefs.density === 'compact');
    root.classList.toggle('density-comfortable', prefs.density === 'comfortable');
  }

  /**
   * Test seam ONLY: drive the mirror directly from specs (05 §7) without an
   * Electron bridge. Never called from application code.
   */
  __setStateForTest(state: WorkbenchState | null): void {
    this._state.set(state);
  }
}
