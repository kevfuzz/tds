import { TestBed } from '@angular/core/testing';
import type { WorkbenchState } from '@rwp2/contracts';
import { WorkbenchStore } from './workbench.store';
import { HostService } from '../services/host.service';

// A HostService that reports no bridge, so the store's constructor skips
// getState/subscribe and we drive the mirror directly (the 05 §7 test seam).
class OfflineHost {
  available = false;
  guestPreloadPath = '';
  invoke = () => Promise.resolve(undefined as never);
  on = () => () => undefined;
}

function fixtureState(): WorkbenchState {
  return {
    user: { id: '4471', name: 'Sinéad Kelly', initials: 'SK', roles: ['csa', 'compliance'], permissions: [] },
    context: { customer: { trn: '3287645T', name: 'Acme Ltd', type: 'Company' }, persona: 'csa', theme: 'dark', density: 'compact', locale: 'en-IE' },
    apps: [
      { manifest: { contractVersion: 1, id: 'customer-records', name: 'Customer records', version: '1.0.0', entryUrl: 'https://apps.rev/cr/', icon: 'pi pi-user', integration: 'sdk' }, origin: 'https://apps.rev', menuStatus: 'ok' },
      { manifest: { contractVersion: 1, id: 'work-queues', name: 'Work queues', version: '1.0.0', entryUrl: 'https://apps.rev/wq/', icon: 'pi pi-inbox', integration: 'sdk' }, origin: 'https://apps.rev', menuStatus: 'failed' },
    ],
    tabs: [
      { id: 't1', kind: 'guest', appId: 'customer-records', key: 'k1', target: { appId: 'customer-records', path: '/bank/3287645T' }, label: 'Acme', shortLabel: 'Acme', icon: 'pi pi-user', customerTrn: '3287645T', dirty: false, closeable: true, lastActiveAt: 1, history: [], forward: [] },
      { id: 't2', kind: 'shell', appId: 'shell', key: 'k2', target: { appId: 'shell', path: '/preferences' }, label: 'Preferences', shortLabel: 'Prefs', icon: 'pi pi-cog', customerTrn: null, dirty: true, closeable: true, lastActiveAt: 2, history: [], forward: [] },
    ],
    activeTabId: 't2',
    menu: [{ id: 'customer-records/reg', label: 'Registrations', group: 'registrations' }],
    prefs: { theme: 'dark', density: 'compact', groupTabsByCustomer: true, alwaysOpenNewTab: false, persona: 'csa' },
    recents: [{ trn: '3287645T', name: 'Acme Ltd', type: 'Company' }],
    favourites: ['3287645T'],
  };
}

describe('WorkbenchStore', () => {
  let store: WorkbenchStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WorkbenchStore, { provide: HostService, useClass: OfflineHost }],
    });
    store = TestBed.inject(WorkbenchStore);
  });

  it('starts on the splash (null state)', () => {
    expect(store.state()).toBeNull();
    expect(store.tabs()).toEqual([]);
    expect(store.activeTab()).toBeNull();
    expect(store.menu()).toEqual([]);
  });

  it('derives computeds from the mirrored state', () => {
    store.__setStateForTest(fixtureState());

    expect(store.tabs().length).toBe(2);
    expect(store.activeTab()?.id).toBe('t2');
    expect(store.activeTab()?.kind).toBe('shell');
    expect(store.user()?.name).toBe('Sinéad Kelly');
    expect(store.context()?.customer?.trn).toBe('3287645T');
    expect(store.prefs()?.groupTabsByCustomer).toBe(true);
    expect(store.recents().map((c) => c.trn)).toEqual(['3287645T']);
    expect(store.menu()[0].label).toBe('Registrations');
    expect(store.apps().filter((a) => a.menuStatus === 'failed').map((a) => a.manifest.id)).toEqual(['work-queues']);
  });

  it('applies theme + density classes via the appearance effect', () => {
    store.__setStateForTest(fixtureState());
    TestBed.tick(); // flush effects

    const root = document.documentElement;
    expect(root.classList.contains('app-dark')).toBe(true);
    expect(root.classList.contains('light')).toBe(false);
    expect(root.classList.contains('density-compact')).toBe(true);

    const light = fixtureState();
    light.prefs = { ...light.prefs, theme: 'light', density: 'comfortable' };
    store.__setStateForTest(light);
    TestBed.tick();

    expect(root.classList.contains('light')).toBe(true);
    expect(root.classList.contains('app-dark')).toBe(false);
    expect(root.classList.contains('density-comfortable')).toBe(true);
  });
});
