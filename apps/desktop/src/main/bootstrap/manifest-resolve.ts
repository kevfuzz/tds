import type { AppManifest, AppRuntimeInfo, CurrentUser } from '@rwp2/contracts';

export type ResolveResult =
  | { ok: true; app: AppRuntimeInfo }
  | { ok: false; reason: string };

/** requiredPermissions ⊆ user.permissions (04 §2). */
export function permitted(manifest: AppManifest, user: CurrentUser): boolean {
  const need = manifest.requiredPermissions ?? [];
  const have = new Set(user.permissions);
  return need.every((p) => have.has(p));
}

/**
 * Pure resolution of one validated manifest to an AppRuntimeInfo, or a drop
 * reason (04 §2): reject a too-new contract, hide an unpermitted app, resolve a
 * relative entryUrl against the manifest URL, compute the navigation-allowlist
 * origin. One bad app never blocks boot — the caller logs and drops.
 */
export function resolveApp(
  manifest: AppManifest,
  manifestUrl: string,
  user: CurrentUser,
  contractVersion: number,
): ResolveResult {
  if (manifest.contractVersion > contractVersion) {
    return { ok: false, reason: `contractVersion ${manifest.contractVersion} > shell ${contractVersion}` };
  }
  if (!permitted(manifest, user)) {
    return { ok: false, reason: 'missing required permissions' };
  }
  let entry: URL;
  try {
    entry = new URL(manifest.entryUrl, manifestUrl);
  } catch {
    return { ok: false, reason: `bad entryUrl ${manifest.entryUrl}` };
  }
  return {
    ok: true,
    app: {
      manifest: { ...manifest, entryUrl: entry.href },
      origin: entry.origin,
      menuStatus: 'ok',
    },
  };
}
