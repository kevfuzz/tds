import {
  CONTRACT_VERSION,
  type CurrentUser,
  type CustomerRef,
  type GuestContext,
  type GuestHostApi,
  type MenuNode,
  type NavigationTarget,
  type Severity,
} from '@rwp2/contracts';
import { FIXTURE_CUSTOMER, FIXTURE_USER } from './fixtures';
import type { StandaloneConfig } from './standalone-config';

const LOG = '[MockHost]';

/**
 * In-page implementation of `GuestHostApi` (03 §7). Backs `@rwp2/sdk`'s
 * standalone dev mode and app unit tests — a fake user, a fixture customer,
 * live context switching, and working close/navigate callbacks, with zero
 * Electron / shell infrastructure (06 §3).
 */
export class MockHost implements GuestHostApi {
  readonly apiVersion = CONTRACT_VERSION;

  private ctx: GuestContext;
  private readonly contextCbs = new Set<(ctx: GuestContext) => void>();
  private readonly navigateCbs = new Set<(t: NavigationTarget) => void>();
  private beforeClose?: () => boolean | Promise<boolean>;

  constructor(config: StandaloneConfig = {}) {
    this.ctx = {
      customer: FIXTURE_CUSTOMER,
      persona: 'csa',
      theme: 'dark',
      density: 'compact',
      locale: 'en-IE',
      ...config.context, // WorkbenchContext overrides (customer, theme, density, …)
      appId: 'standalone',
      tabId: 't-standalone',
      user: config.user ?? FIXTURE_USER,
      launch: { appId: 'standalone', path: '/' },
    };
  }

  getUser(): Promise<CurrentUser> {
    return Promise.resolve(this.ctx.user);
  }

  getContext(): Promise<GuestContext> {
    return Promise.resolve(this.ctx);
  }

  onContextChanged(cb: (ctx: GuestContext) => void): () => void {
    this.contextCbs.add(cb);
    return () => this.contextCbs.delete(cb);
  }

  onNavigateInPlace(cb: (t: NavigationTarget) => void): () => void {
    this.navigateCbs.add(cb);
    return () => this.navigateCbs.delete(cb);
  }

  navigate(target: NavigationTarget): Promise<void> {
    console.info(LOG, 'navigate', target);
    if (target.customer) this.setContext({ customer: target.customer });
    // Same-app in-place navigation is echoed back so the guest routes itself.
    if (target.appId === this.ctx.appId) this.emitNavigateInPlace(target);
    return Promise.resolve();
  }

  openCustomer(trn: string): Promise<void> {
    console.info(LOG, 'openCustomer', trn);
    const customer: CustomerRef = { trn, name: `Customer ${trn}`, type: 'Individual' };
    this.setContext({ customer });
    return Promise.resolve();
  }

  setDirty(dirty: boolean): void {
    console.info(LOG, 'setDirty', dirty);
  }

  contributeMenu(items: MenuNode[]): void {
    console.info(LOG, 'contributeMenu', items);
  }

  notify(n: { severity: Severity; summary: string; detail?: string }): void {
    console.info(LOG, `notify:${n.severity}`, n.summary, n.detail ?? '');
  }

  onBeforeClose(handler: () => boolean | Promise<boolean>): () => void {
    this.beforeClose = handler;
    return () => {
      if (this.beforeClose === handler) this.beforeClose = undefined;
    };
  }

  // --- dev / test helpers (not part of GuestHostApi) ------------------------

  /** Merge a context patch and notify subscribers (drives the dev widget). */
  setContext(patch: Partial<GuestContext>): GuestContext {
    this.ctx = { ...this.ctx, ...patch };
    for (const cb of this.contextCbs) cb(this.ctx);
    return this.ctx;
  }

  /** Simulate a shell-driven in-place navigation. */
  emitNavigateInPlace(t: NavigationTarget): void {
    for (const cb of this.navigateCbs) cb(t);
  }

  /** Simulate the shell asking to close; resolves the guard's verdict. */
  requestClose(): Promise<boolean> {
    return Promise.resolve(this.beforeClose ? this.beforeClose() : true);
  }
}
