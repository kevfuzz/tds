import { ApplicationConfig } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { provideWorkbench } from '@rwp2/sdk';
import { rwp2AuraPreset } from '@rwp2/ui';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withHashLocation()), // hash routing — shell launches us at entryUrl#/path
    provideWorkbench(), // detects window.rwp2Host; falls back to MockHost in standalone/dev
    providePrimeNG({ theme: rwp2AuraPreset }), // from @rwp2/ui — matches shell theming
  ],
};
