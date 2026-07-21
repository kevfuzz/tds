import type { CustomerRef } from './identity';

/** 03 §2 — Navigation. */

export interface NavigationTarget {
  appId: string; // registry app id, e.g. 'customer-records'
  path: string; // app-internal route, e.g. '/bank/3287645T'
  params?: Record<string, string>;
  customer?: CustomerRef; // sets/overrides workbench customer context
  openMode?: 'reuse' | 'newTab' | 'window'; // default 'reuse'; 'window' reserved (01 §9)
  label?: string; // optional tab label override
}

/**
 * Normalize an app-internal path so that trivially-different spellings of the
 * same route ('/bank/', '/bank', '//bank') collapse to one tab identity.
 */
export function normalizePath(path: string): string {
  const trimmed = (path ?? '').trim();
  if (trimmed === '' || trimmed === '/') return '/';
  const withLead = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const collapsed = withLead.replace(/\/{2,}/g, '/');
  return collapsed.length > 1 ? collapsed.replace(/\/+$/, '') : collapsed;
}

/**
 * 03 §2 — deterministic tab identity. `openMode:'reuse'` activates an existing
 * tab with the same key. Computed in main; exported here so the reducer and its
 * tests share exactly one implementation.
 */
export function tabKey(t: NavigationTarget): string {
  return `${t.appId}::${normalizePath(t.path)}::${t.customer?.trn ?? '-'}`;
}
