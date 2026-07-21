import { describe, expect, it } from 'vitest';
import { normalizePath, tabKey } from './navigation';
import type { CustomerRef } from './identity';

const acme: CustomerRef = { trn: '3287645T', name: 'Acme Ltd', type: 'Company' };

describe('normalizePath', () => {
  it('collapses empty and root variants to "/"', () => {
    expect(normalizePath('')).toBe('/');
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('  ')).toBe('/');
  });

  it('adds a leading slash and strips trailing slashes', () => {
    expect(normalizePath('bank')).toBe('/bank');
    expect(normalizePath('/bank/')).toBe('/bank');
  });

  it('collapses duplicate slashes', () => {
    expect(normalizePath('//bank///3287645T/')).toBe('/bank/3287645T');
  });
});

describe('tabKey (03 §2)', () => {
  it('is deterministic for equivalent targets', () => {
    const a = tabKey({ appId: 'customer-records', path: '/bank/3287645T', customer: acme });
    const b = tabKey({ appId: 'customer-records', path: 'bank/3287645T/', customer: acme });
    expect(a).toBe(b);
    expect(a).toBe('customer-records::/bank/3287645T::3287645T');
  });

  it('uses "-" when no customer is present', () => {
    expect(tabKey({ appId: 'work-queues', path: '/mine' })).toBe('work-queues::/mine::-');
  });

  it('distinguishes apps, paths, and customers', () => {
    const base = { appId: 'customer-records', path: '/overview', customer: acme };
    expect(tabKey(base)).not.toBe(tabKey({ ...base, appId: 'forms' }));
    expect(tabKey(base)).not.toBe(tabKey({ ...base, path: '/bank' }));
    expect(tabKey(base)).not.toBe(
      tabKey({ ...base, customer: { ...acme, trn: '9999999X' } }),
    );
  });
});
