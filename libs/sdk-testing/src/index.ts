/**
 * @rwp2/sdk-testing — in-page `GuestHostApi` for unit tests and standalone dev
 * (02 §2, 06 §3). Depends only on @rwp2/contracts. No Angular, no Electron.
 */
export { MockHost } from './lib/mock-host';
export { installMockHost } from './lib/install';
export { FIXTURE_USER, FIXTURE_CUSTOMER } from './lib/fixtures';
export type { StandaloneConfig } from './lib/standalone-config';
