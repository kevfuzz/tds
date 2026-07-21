import type { CurrentUser, WorkbenchContext } from '@rwp2/contracts';

/**
 * Configuration for standalone dev / tests (06 §3). Structurally identical to
 * the `standalone` slice `@rwp2/sdk`'s `provideWorkbench()` accepts, so the two
 * libraries stay decoupled (sdk depends only on @rwp2/contracts).
 */
export interface StandaloneConfig {
  user?: CurrentUser;
  context?: Partial<WorkbenchContext>;
}
