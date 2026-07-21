import type { WorkbenchState } from '@rwp2/contracts';
import type { Action } from './actions';
import { initialState } from './initial-state';
import { rootReducer } from './reducers';
import { diffPatch } from './selectors';

export type StoreListener = (
  next: WorkbenchState,
  patch: Partial<WorkbenchState>,
  action: Action,
) => void;

/**
 * WorkbenchStore (04 §3) — the single source of truth. ~60 lines: current
 * state, `dispatch` applying the pure root reducer, and a listener set that
 * receives the new state plus the computed `wb:stateChanged` patch. Contains no
 * Electron imports; the composition root wires listeners that push over IPC.
 */
export class WorkbenchStore {
  private _state: WorkbenchState;
  private readonly listeners = new Set<StoreListener>();
  private counter = 0;

  constructor(persistedPrefs?: Partial<WorkbenchState['prefs']>) {
    this._state = initialState(persistedPrefs);
  }

  get state(): WorkbenchState {
    return this._state;
  }

  /** Monotonic tab id source ('t' + counter, 03 §3). */
  nextTabId(): string {
    return `t${++this.counter}`;
  }

  dispatch(action: Action): WorkbenchState {
    const prev = this._state;
    const next = rootReducer(prev, action);
    if (next === prev) return prev; // no-op reducers return the same reference
    this._state = next;
    const patch = diffPatch(prev, next);
    for (const l of this.listeners) l(next, patch, action);
    return next;
  }

  subscribe(l: StoreListener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
}
