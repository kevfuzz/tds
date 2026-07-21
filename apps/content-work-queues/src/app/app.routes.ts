import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'my-queue' },
  {
    path: 'my-queue',
    loadComponent: () =>
      import('./screens/my-queue/my-queue.screen').then((m) => m.MyQueueScreen),
  },
];
