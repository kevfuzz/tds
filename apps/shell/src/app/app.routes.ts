import { Routes } from '@angular/router';

/**
 * Shell-native screens (kind:'shell') are lazy-loaded (01 §3). The content area
 * renders the active shell screen via `ngComponentOutlet` (05 §3); these routes
 * also make each screen reachable/lazy-split and give the app a Router instance.
 */
export const routes: Routes = [
  {
    path: 'preferences',
    loadComponent: () =>
      import('./screens/preferences/preferences.component').then((m) => m.PreferencesComponent),
  },
];
