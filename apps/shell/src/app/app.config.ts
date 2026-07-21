import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { rwp2AuraPreset } from '@rwp2/ui';
import { routes } from './app.routes';
import { provideWorkbenchShell } from './state/provide-workbench-shell';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideAnimationsAsync(),
    provideRouter(routes, withHashLocation()),
    providePrimeNG({ theme: rwp2AuraPreset }), // Aura/Emerald preset from @rwp2/ui
    provideWorkbenchShell(), // wires WorkbenchStore + HostService (shell-local)
  ],
};
