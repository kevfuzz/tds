import { describe, expect, it } from 'vitest';
import type { WorkbenchState } from '@rwp2/contracts';
import { initialState } from './initial-state';
import { APPS, ACME, USER } from './test-fixtures';
import { openTarget } from './reducers/tabs.reducer';
import { diffPatch, guestContext } from './selectors';

describe('guestContext scoping (01 §4)', () => {
  it('hands a guest only its own scoped context + user + launch target', () => {
    let s: WorkbenchState = {
      ...initialState(),
      apps: APPS,
      user: USER,
      context: { ...initialState().context, customer: ACME },
    };
    s = openTarget(s, { appId: 'customer-records', path: '/overview', customer: ACME }, 't1', 1);
    const ctx = guestContext(s, 't1');
    expect(ctx).not.toBeNull();
    expect(ctx!.appId).toBe('customer-records');
    expect(ctx!.tabId).toBe('t1');
    expect(ctx!.user.id).toBe(USER.id);
    expect(ctx!.customer?.trn).toBe(ACME.trn);
    expect(ctx!.launch.path).toBe('/overview');
  });

  it('returns null for an unknown tab', () => {
    expect(guestContext(initialState(), 'nope')).toBeNull();
  });
});

describe('diffPatch (03 §3)', () => {
  it('includes only top-level slices whose reference changed', () => {
    const a = initialState();
    const b = { ...a, activeTabId: 't1' };
    expect(Object.keys(diffPatch(a, b))).toEqual(['activeTabId']);
    expect(diffPatch(a, a)).toEqual({});
  });
});
