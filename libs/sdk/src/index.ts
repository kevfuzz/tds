/**
 * @rwp2/sdk — the ergonomic Angular layer over `GuestHostApi` (02 §2, 06 §2).
 * Depends only on @rwp2/contracts + Angular 21 (peer). The MockHost fallback is
 * lazy-loaded from @rwp2/sdk-testing at runtime in standalone dev only.
 */
export { provideWorkbench } from './lib/provide-workbench';
export { Workbench } from './lib/workbench';
export { HostMenuContributor } from './lib/host-menu-contributor';
export { DirtyGuard } from './lib/dirty-guard';
export { GUEST_HOST, IS_EMBEDDED, WORKBENCH_CONFIG } from './lib/config';
export type { WorkbenchConfig, StandaloneConfig } from './lib/config';
