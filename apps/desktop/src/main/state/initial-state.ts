import type { CurrentUser, Prefs, WorkbenchState } from '@rwp2/contracts';

export const DEFAULT_PREFS: Prefs = {
  theme: 'dark',
  density: 'compact',
  groupTabsByCustomer: false,
  alwaysOpenNewTab: false,
  persona: 'csa',
};

/** Identity used before `boot` resolves the real CurrentUser (splash state). */
export const ANON_USER: CurrentUser = {
  id: '',
  name: '',
  initials: '',
  roles: [],
  permissions: [],
};

export function initialState(prefs: Partial<Prefs> = {}): WorkbenchState {
  const p: Prefs = { ...DEFAULT_PREFS, ...prefs };
  return {
    user: ANON_USER,
    context: {
      customer: null,
      persona: p.persona,
      theme: p.theme,
      density: p.density,
      locale: 'en-IE',
    },
    apps: [],
    tabs: [],
    activeTabId: null,
    menu: [],
    prefs: p,
    recents: [],
    favourites: [],
  };
}
