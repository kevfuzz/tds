import { beforeEach, describe, expect, it } from 'vitest';
import type { WorkbenchState } from '@rwp2/contracts';
import { initialState } from '../initial-state';
import { APPS, ACME, BLOGGS } from '../test-fixtures';
import {
  activateTab,
  closeTab,
  navBack,
  navForward,
  openTarget,
  planOpen,
  reorderTabs,
  setDirty,
} from './tabs.reducer';

let base: WorkbenchState;
beforeEach(() => {
  base = { ...initialState(), apps: APPS };
});

const t = (appId: string, path: string, customer = ACME, openMode?: 'reuse' | 'newTab') => ({
  appId,
  path,
  customer,
  openMode,
});

describe('openTarget decision order (04 §3)', () => {
  it('appends a new tab when none match', () => {
    const s = openTarget(base, t('customer-records', '/overview'), 't1', 1);
    expect(s.tabs).toHaveLength(1);
    expect(s.activeTabId).toBe('t1');
    expect(s.tabs[0].customerTrn).toBe(ACME.trn);
  });

  it('reuses a tab with a matching key instead of opening a second', () => {
    const s1 = openTarget(base, t('customer-records', '/overview'), 't1', 1);
    const s2 = openTarget(s1, t('customer-records', '/overview'), 't2', 2);
    expect(s2.tabs).toHaveLength(1);
    expect(s2.activeTabId).toBe('t1');
    expect(s2.tabs[0].lastActiveAt).toBe(2); // reuse stamps lastActiveAt
  });

  it('navigates in place on the active tab (same app + same customer)', () => {
    const s1 = openTarget(base, t('customer-records', '/overview'), 't1', 1);
    const s2 = openTarget(s1, t('customer-records', '/bank'), 't2', 2);
    expect(s2.tabs).toHaveLength(1);
    expect(s2.tabs[0].target.path).toBe('/bank');
    expect(s2.tabs[0].history).toHaveLength(1); // old target pushed to history
    expect(s2.tabs[0].forward).toHaveLength(0);
    expect(planOpen(s1, t('customer-records', '/bank')).kind).toBe('inPlace');
  });

  it('opens a new tab for a different customer of the same app', () => {
    const s1 = openTarget(base, t('customer-records', '/overview', ACME), 't1', 1);
    const s2 = openTarget(s1, t('customer-records', '/overview', BLOGGS), 't2', 2);
    expect(s2.tabs).toHaveLength(2);
    expect(s2.activeTabId).toBe('t2');
  });

  it("openMode 'newTab' always appends even when a key matches", () => {
    const s1 = openTarget(base, t('customer-records', '/overview'), 't1', 1);
    const s2 = openTarget(s1, t('customer-records', '/overview', ACME, 'newTab'), 't2', 2);
    expect(s2.tabs).toHaveLength(2);
  });

  it('respects prefs.alwaysOpenNewTab (no in-place)', () => {
    const b = { ...base, prefs: { ...base.prefs, alwaysOpenNewTab: true } };
    const s1 = openTarget(b, t('customer-records', '/overview'), 't1', 1);
    const s2 = openTarget(s1, t('customer-records', '/bank'), 't2', 2);
    expect(s2.tabs).toHaveLength(2);
  });

  it('ignores an unknown app (defensive no-op)', () => {
    const s = openTarget(base, t('ghost-app', '/x'), 't1', 1);
    expect(s).toBe(base);
  });
});

describe('close / activate / reorder', () => {
  it('closeTab activates the left neighbour', () => {
    let s = openTarget(base, t('customer-records', '/a'), 't1', 1);
    s = openTarget(s, t('work-queues', '/b'), 't2', 2);
    s = openTarget(s, t('forms', '/c'), 't3', 3);
    s = closeTab(s, 't3'); // active was t3
    expect(s.tabs.map((x) => x.id)).toEqual(['t1', 't2']);
    expect(s.activeTabId).toBe('t2');
  });

  it('closeTab of last remaining tab clears active', () => {
    const s = closeTab(openTarget(base, t('customer-records', '/a'), 't1', 1), 't1');
    expect(s.tabs).toHaveLength(0);
    expect(s.activeTabId).toBeNull();
  });

  it('activateTab stamps lastActiveAt (LRU input)', () => {
    let s = openTarget(base, t('customer-records', '/a'), 't1', 1);
    s = openTarget(s, t('work-queues', '/b'), 't2', 2);
    s = activateTab(s, 't1', 99);
    expect(s.tabs.find((x) => x.id === 't1')!.lastActiveAt).toBe(99);
  });

  it('reorderTabs reorders by id list', () => {
    let s = openTarget(base, t('customer-records', '/a'), 't1', 1);
    s = openTarget(s, t('work-queues', '/b'), 't2', 2);
    s = reorderTabs(s, ['t2', 't1']);
    expect(s.tabs.map((x) => x.id)).toEqual(['t2', 't1']);
  });
});

describe('dirty + history', () => {
  it('setDirty flips the flag on one tab', () => {
    const s = setDirty(openTarget(base, t('customer-records', '/a'), 't1', 1), 't1', true);
    expect(s.tabs[0].dirty).toBe(true);
  });

  it('back then forward restores the target and swaps history/forward', () => {
    let s = openTarget(base, t('customer-records', '/overview'), 't1', 1);
    s = openTarget(s, t('customer-records', '/bank'), 't2', 2); // in-place
    s = navBack(s, 't1', 3);
    expect(s.tabs[0].target.path).toBe('/overview');
    expect(s.tabs[0].forward).toHaveLength(1);
    s = navForward(s, 't1', 4);
    expect(s.tabs[0].target.path).toBe('/bank');
    expect(s.tabs[0].forward).toHaveLength(0);
  });
});
