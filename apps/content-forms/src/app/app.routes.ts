import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'vat3' },
  {
    path: 'vat3',
    loadComponent: () => import('./screens/vat3/vat3.screen').then((m) => m.Vat3Screen),
  },
];
