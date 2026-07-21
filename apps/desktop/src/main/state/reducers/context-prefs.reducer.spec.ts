import { describe, expect, it } from 'vitest';
import { initialState } from '../initial-state';
import { ACME, BLOGGS } from '../test-fixtures';
import { openCustomer, setFavourite } from './context.reducer';
import { setPref } from './prefs.reducer';

describe('context.reducer', () => {
  it('openCustomer sets the customer and dedups recents to a max of 6', () => {
    let s = initialState();
    for (let i = 0; i < 8; i++) {
      s = openCustomer(s, { trn: `T${i}`, name: `C${i}`, type: 'Individual' });
    }
    expect(s.recents).toHaveLength(6);
    expect(s.recents[0].trn).toBe('T7'); // most recent first
    expect(s.context.customer?.trn).toBe('T7');
  });

  it('openCustomer flags every app menu as loading', () => {
    const s0 = { ...initialState(), apps: [{ manifest: { id: 'x' }, origin: 'o', menuStatus: 'ok' } as any] };
    const s = openCustomer(s0, ACME);
    expect(s.apps[0].menuStatus).toBe('loading');
  });

  it('setFavourite toggles a TRN idempotently', () => {
    let s = setFavourite(initialState(), BLOGGS.trn, true);
    expect(s.favourites).toEqual([BLOGGS.trn]);
    s = setFavourite(s, BLOGGS.trn, true); // idempotent add
    expect(s.favourites).toEqual([BLOGGS.trn]);
    s = setFavourite(s, BLOGGS.trn, false);
    expect(s.favourites).toEqual([]);
  });
});

describe('prefs.reducer', () => {
  it('setPref merges and mirrors theme/density/persona into context', () => {
    const s = setPref(initialState(), { theme: 'light', persona: 'compliance' });
    expect(s.prefs.theme).toBe('light');
    expect(s.context.theme).toBe('light');
    expect(s.context.persona).toBe('compliance');
  });
});
