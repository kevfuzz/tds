import { inject, Injectable, signal, type Signal } from '@angular/core';
import { Router } from '@angular/router';
import type {
  CurrentUser,
  GuestContext,
  MenuNode,
  NavigationTarget,
  Severity,
} from '@rwp2/contracts';
import { GUEST_HOST, IS_EMBEDDED } from './config';
import { applyThemeClasses, targetToUrl } from './theme';

function seedContext(): GuestContext {
  return {
    customer: null,
    persona: '',
    theme: 'dark',
    density: 'compact',
    locale: 'en-IE',
    appId: '',
    tabId: '',
    user: { id: '', name: '', initials: '', roles: [], permissions: [] },
    launch: { appId: '', path: '/' },
  };
}

/**
 * The single ergonomic Angular layer over `GuestHostApi` (06 §2). Binds the
 * bridge, mirrors context into signals, routes shell-driven in-place navigation
 * through Angular's Router, and follows the shell's theme/density.
 */
@Injectable({ providedIn: 'root' })
export class Workbench {
  private readonly host = inject(GUEST_HOST);
  private readonly router = inject(Router, { optional: true });

  /** false when running standalone (dev) — no real shell bridge (06 §2). */
  readonly embedded: boolean = inject(IS_EMBEDDED);

  private readonly _context = signal<GuestContext>(seedContext());
  private readonly _user = signal<CurrentUser>(this._context().user);

  readonly context: Signal<GuestContext> = this._context.asReadonly();
  readonly user: Signal<CurrentUser> = this._user.asReadonly();

  /** Called by provideWorkbench()'s app initializer; idempotent-safe. */
  async init(): Promise<void> {
    this.host.onContextChanged((ctx) => this.applyContext(ctx));
    this.host.onNavigateInPlace((t) => this.routeInPlace(t));
    this.applyContext(await this.host.getContext());
  }

  navigate(target: NavigationTarget): Promise<void> {
    return this.host.navigate(target);
  }

  openCustomer(trn: string): Promise<void> {
    return this.host.openCustomer(trn);
  }

  setDirty(dirty: boolean): void {
    this.host.setDirty(dirty);
  }

  contributeMenu(items: MenuNode[]): void {
    this.host.contributeMenu(items);
  }

  notify(n: { severity: Severity; summary: string; detail?: string }): void {
    this.host.notify(n);
  }

  /** Register a close guard; returns an unregister fn. One handler max (03 §7). */
  registerCloseGuard(fn: () => boolean | Promise<boolean>): () => void {
    return this.host.onBeforeClose(fn);
  }

  private applyContext(ctx: GuestContext): void {
    this._context.set(ctx);
    this._user.set(ctx.user);
    applyThemeClasses(ctx.theme, ctx.density);
  }

  private routeInPlace(target: NavigationTarget): void {
    void this.router?.navigateByUrl(targetToUrl(target));
  }
}
