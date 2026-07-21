import {
  type EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import {
  GUEST_HOST,
  hasHostBridge,
  IS_EMBEDDED,
  requireHost,
  WORKBENCH_CONFIG,
  type WorkbenchConfig,
} from './config';
import { Workbench } from './workbench';

/**
 * Wire an Angular content app to the workbench (06 §2). Detects the shell
 * bridge (`window.rwp2Host`); when absent (standalone `ng serve` / tests) it
 * lazily installs the MockHost from `@rwp2/sdk-testing` so the same code path
 * runs with a fake user + fixture customer.
 *
 * The MockHost is loaded via dynamic import so `@rwp2/sdk`'s static dependency
 * graph stays limited to `@rwp2/contracts` + Angular (02 §2, 02 §3).
 */
export function provideWorkbench(config: WorkbenchConfig = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: WORKBENCH_CONFIG, useValue: config },
    { provide: IS_EMBEDDED, useValue: hasHostBridge() },
    // 1. Ensure a bridge exists before anything reads it.
    provideAppInitializer(async () => {
      if (!hasHostBridge()) {
        const { installMockHost } = await import('@rwp2/sdk-testing');
        installMockHost(config.standalone);
      }
    }),
    { provide: GUEST_HOST, useFactory: () => requireHost() },
    // 2. Bind the Workbench and pull the initial context.
    provideAppInitializer(() => inject(Workbench).init()),
  ]);
}
