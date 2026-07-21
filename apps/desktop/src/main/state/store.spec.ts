import { describe, expect, it } from 'vitest';
import { WorkbenchStore } from './store';
import { APPS, USER, ACME } from './test-fixtures';

describe('WorkbenchStore', () => {
  it('boot sets user + apps and emits a patch to listeners', () => {
    const store = new WorkbenchStore();
    const patches: string[][] = [];
    store.subscribe((_n, patch) => patches.push(Object.keys(patch)));
    store.dispatch({ type: 'boot', user: USER, apps: APPS });
    expect(store.state.user.id).toBe('4471');
    expect(store.state.apps).toHaveLength(3);
    expect(patches[0]).toContain('user');
    expect(patches[0]).toContain('apps');
  });

  it('emits only changed slices in the patch', () => {
    const store = new WorkbenchStore();
    store.dispatch({ type: 'boot', user: USER, apps: APPS });
    let last: string[] = [];
    store.subscribe((_n, patch) => (last = Object.keys(patch)));
    store.dispatch({ type: 'openCustomer', customer: ACME, now: 1 });
    expect(last).toContain('context');
    expect(last).toContain('recents');
    expect(last).not.toContain('prefs');
  });

  it('a no-op reducer result does not notify', () => {
    const store = new WorkbenchStore();
    store.dispatch({ type: 'boot', user: USER, apps: APPS });
    let count = 0;
    store.subscribe(() => count++);
    store.dispatch({ type: 'setDirty', tabId: 'nonexistent', dirty: true });
    expect(count).toBe(0);
  });

  it('nextTabId is monotonic', () => {
    const store = new WorkbenchStore();
    expect([store.nextTabId(), store.nextTabId(), store.nextTabId()]).toEqual(['t1', 't2', 't3']);
  });
});
