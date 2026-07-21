import type { NavigationTarget } from './navigation';

/** 03 §4 — Menu contributions. */

export interface MenuNode {
  id: string; // main namespaces to '<appId>/<id>' on merge
  label: string;
  icon?: string; // 'pi pi-*'
  group: 'registrations' | 'profiles' | 'financials' | 'external' | 'forms' | string;
  order?: number; // within group; ties → registry order → label
  target?: NavigationTarget; // leaf nodes navigate; group nodes may omit
  children?: MenuNode[];
  badge?: string; // e.g. 'draft'
}

/**
 * GET manifest.menu.customerMenuUrl (template vars: {trn} {persona}).
 * Headers: cookies of the app session (SSO). Timeout: 2000ms.
 */
export interface CustomerMenuResponse {
  items: MenuNode[];
  ttlSeconds?: number; // main may cache per (appId, trn, persona); default 300
}
