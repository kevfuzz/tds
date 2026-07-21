import { DestroyRef, inject, Injectable, signal, type Signal } from '@angular/core';
import { Workbench } from './workbench';

/**
 * Pairs `setDirty()` with a close guard (06 §2). Mark the screen dirty on edit
 * and clean on save/discard: this drives the tab's ● dot and, when dirty, the
 * registered guard vetoes close unless `confirm` resolves true. Provide it at
 * the screen (route) level so its guard unregisters with the component.
 */
@Injectable()
export class DirtyGuard {
  private readonly wb = inject(Workbench);
  private readonly _dirty = signal(false);
  readonly dirty: Signal<boolean> = this._dirty.asReadonly();

  /** Async predicate consulted only when dirty. Override via `setConfirm`. */
  private confirm: () => boolean | Promise<boolean> = () => true;

  constructor() {
    const unregister = this.wb.registerCloseGuard(() =>
      this._dirty() ? this.confirm() : true,
    );
    inject(DestroyRef).onDestroy(unregister);
  }

  markDirty(): void {
    this._dirty.set(true);
    this.wb.setDirty(true);
  }

  markClean(): void {
    this._dirty.set(false);
    this.wb.setDirty(false);
  }

  /** Supply a confirm dialog (e.g. "Discard unsaved changes?"). */
  setConfirm(fn: () => boolean | Promise<boolean>): void {
    this.confirm = fn;
  }
}
