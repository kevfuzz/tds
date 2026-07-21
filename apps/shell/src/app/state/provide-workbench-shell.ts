import { EnvironmentProviders, makeEnvironmentProviders, provideAppInitializer, inject } from '@angular/core';
import { HostService } from '../services/host.service';
import { WorkbenchStore } from './workbench.store';

/**
 * Shell-local provider (NOT from a lib). Wires the two singletons that make the
 * mirror live: `HostService` (the sole bridge call site) and `WorkbenchStore`
 * (the signal mirror). Eagerly instantiating the store at bootstrap means it
 * subscribes to `wb:stateChanged` and requests `wb:getState` before any chrome
 * renders, so the first paint is either the splash or a fully-seeded workbench.
 */
export function provideWorkbenchShell(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() => {
      inject(HostService);
      inject(WorkbenchStore);
    }),
  ]);
}
