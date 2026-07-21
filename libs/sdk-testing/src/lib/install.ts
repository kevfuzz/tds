import { MockHost } from './mock-host';
import type { StandaloneConfig } from './standalone-config';

/**
 * Construct a `MockHost` and expose it as `window.rwp2Host`, so that code
 * reading the bridge (e.g. `@rwp2/sdk`'s `provideWorkbench()`) behaves exactly
 * as it would when embedded (06 §3). Returns the host for direct test control.
 */
export function installMockHost(config: StandaloneConfig = {}): MockHost {
  const host = new MockHost(config);
  if (typeof window !== 'undefined') {
    window.rwp2Host = host;
  }
  return host;
}
