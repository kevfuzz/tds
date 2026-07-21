import { describe, expect, it, vi } from 'vitest';
import {
  CONTRACT_VERSION,
  type GuestHostApi,
  type NavigationTarget,
} from '@rwp2/contracts';
import { FIXTURE_CUSTOMER, FIXTURE_USER } from './fixtures';
import { installMockHost } from './install';
import { MockHost } from './mock-host';

/** MockHost must satisfy the full GuestHostApi surface (03 §7). */
const REQUIRED_METHODS: (keyof GuestHostApi)[] = [
  'getUser',
  'getContext',
  'onContextChanged',
  'onNavigateInPlace',
  'navigate',
  'openCustomer',
  'setDirty',
  'contributeMenu',
  'notify',
  'onBeforeClose',
];

describe('MockHost', () => {
  it('structurally satisfies GuestHostApi', () => {
    const host: GuestHostApi = new MockHost();
    expect(host.apiVersion).toBe(CONTRACT_VERSION);
    for (const m of REQUIRED_METHODS) {
      expect(typeof host[m]).toBe('function');
    }
  });

  it('serves the fixture user and customer by default', async () => {
    const host = new MockHost();
    expect(await host.getUser()).toEqual(FIXTURE_USER);
    expect((await host.getContext()).customer).toEqual(FIXTURE_CUSTOMER);
  });

  it('honours standalone config overrides', async () => {
    const host = new MockHost({ context: { theme: 'light', persona: 'compliance' } });
    const ctx = await host.getContext();
    expect(ctx.theme).toBe('light');
    expect(ctx.persona).toBe('compliance');
  });

  it('notifies context subscribers on openCustomer and supports unsubscribe', async () => {
    const host = new MockHost();
    const seen: string[] = [];
    const off = host.onContextChanged((c) => seen.push(c.customer?.trn ?? '-'));
    await host.openCustomer('1111111A');
    off();
    await host.openCustomer('2222222B');
    expect(seen).toEqual(['1111111A']);
    expect((await host.getContext()).customer?.trn).toBe('2222222B');
  });

  it('emits in-place navigation for same-app targets', () => {
    const host = new MockHost();
    const cb = vi.fn();
    host.onNavigateInPlace(cb);
    const target: NavigationTarget = { appId: 'standalone', path: '/overview' };
    void host.navigate(target);
    expect(cb).toHaveBeenCalledWith(target);
  });

  it('runs the registered close guard and can veto', async () => {
    const host = new MockHost();
    host.onBeforeClose(() => false);
    expect(await host.requestClose()).toBe(false);
  });

  it('installMockHost publishes window.rwp2Host', () => {
    const host = installMockHost();
    expect(window.rwp2Host).toBe(host);
  });
});
