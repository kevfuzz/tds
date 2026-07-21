import type { Density, NavigationTarget, Theme } from '@rwp2/contracts';

/**
 * Apply the shell's theme/density to `document.documentElement`, so PrimeNG +
 * Tailwind (via @rwp2/ui tokens) follow the workbench automatically (06 §2).
 */
export function applyThemeClasses(theme: Theme, density: Density): void {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  el.classList.toggle('light', theme === 'light');
  el.classList.toggle('dark', theme === 'dark');
  el.classList.toggle('density-compact', density === 'compact');
  el.classList.toggle('density-comfortable', density === 'comfortable');
}

/** Build a Router URL from a NavigationTarget's path + params (06 §2). */
export function targetToUrl(target: NavigationTarget): string {
  const base = target.path.startsWith('/') ? target.path : `/${target.path}`;
  const query = target.params ? new URLSearchParams(target.params).toString() : '';
  return query ? `${base}?${query}` : base;
}
