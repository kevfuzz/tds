import type { WorkbenchState } from '@rwp2/contracts';
import type { Action } from '../actions';
import { initialState } from '../initial-state';
import * as tabs from './tabs.reducer';
import * as context from './context.reducer';
import * as menu from './menu.reducer';
import * as prefs from './prefs.reducer';

/** The single pure root reducer (04 §3). No Electron imports anywhere in this
 *  module graph — that is what lets 04 §9 test the state engine in isolation. */
export function rootReducer(state: WorkbenchState, action: Action): WorkbenchState {
  switch (action.type) {
    case 'boot': {
      const seeded = initialState({ ...state.prefs, ...action.prefs });
      return { ...seeded, user: action.user, apps: action.apps };
    }
    case 'openTarget':
      return tabs.openTarget(state, action.target, action.id, action.now);
    case 'activateTab':
      return tabs.activateTab(state, action.tabId, action.now);
    case 'closeTab':
      return tabs.closeTab(state, action.tabId);
    case 'reorderTabs':
      return tabs.reorderTabs(state, action.orderedIds);
    case 'setDirty':
      return tabs.setDirty(state, action.tabId, action.dirty);
    case 'navBack':
      return tabs.navBack(state, action.tabId, action.now);
    case 'navForward':
      return tabs.navForward(state, action.tabId, action.now);
    case 'openCustomer':
      return context.openCustomer(state, action.customer);
    case 'setFavourite':
      return context.setFavourite(state, action.trn, action.fav);
    case 'setPref':
      return prefs.setPref(state, action.prefs);
    case 'menuLoading':
      return menu.menuLoading(state, action.appIds);
    case 'menuResolved':
      return menu.menuResolved(state, action.menu, action.statuses);
    default: {
      const _exhaustive: never = action;
      return state ?? _exhaustive;
    }
  }
}
