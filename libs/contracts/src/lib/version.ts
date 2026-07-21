/**
 * Wire-compatibility version (03). Bumped ONLY on breaking payload changes.
 * A manifest whose `contractVersion` exceeds this is refused (and logged) by
 * the shell (01 §5); the shell supports N and N-1 during migration windows.
 */
export const CONTRACT_VERSION = 1;
