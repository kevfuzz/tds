import type { NavigationTarget } from './navigation';

/** 03 §1 — Identity & context. */

export interface CurrentUser {
  id: string; // '4471'
  name: string; // 'Sinéad Kelly'
  initials: string;
  roles: string[]; // coarse: 'csa' | 'compliance' | …
  permissions: string[]; // fine-grained, e.g. 'app.customer-records', 'forms.submit'
}

export interface CustomerRef {
  trn: string; // '3287645T'
  name: string;
  type: 'Individual' | 'Company';
}

export type Theme = 'dark' | 'light';
export type Density = 'compact' | 'comfortable';

export interface WorkbenchContext {
  customer: CustomerRef | null; // the workbench-level "open customer"
  persona: string; // active role key
  theme: Theme;
  density: Density;
  locale: string; // 'en-IE'
}

/** What one guest is allowed to see. Pushed on load and on every change. */
export interface GuestContext extends WorkbenchContext {
  appId: string;
  tabId: string;
  user: CurrentUser;
  launch: NavigationTarget; // the target this tab was opened with
}
