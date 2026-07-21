import { net } from 'electron';
import {
  appManifestSchema,
  registrySchema,
  CONTRACT_VERSION,
  type AppRuntimeInfo,
  type CurrentUser,
} from '@rwp2/contracts';
import type { Config } from '../config';
import { resolveApp } from './manifest-resolve';

async function fetchJson(url: string): Promise<unknown> {
  const res = await net.fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

/**
 * D4 / 04 §2 — fetch registry.json, then every manifest in parallel. Each is
 * zod-validated, contract-checked, permission-filtered, and resolved. Invalid
 * or unreachable manifests are logged and dropped; boot proceeds regardless.
 * Registry order is preserved (it is the default menu/app ordering).
 */
export async function loadRegistry(cfg: Config, user: CurrentUser): Promise<AppRuntimeInfo[]> {
  const registry = registrySchema.parse(await fetchJson(cfg.registryUrl));

  const resolved = await Promise.all(
    registry.apps.map(async ({ manifestUrl }): Promise<AppRuntimeInfo | null> => {
      try {
        const manifest = appManifestSchema.parse(await fetchJson(manifestUrl));
        const result = resolveApp(manifest, manifestUrl, user, CONTRACT_VERSION);
        if (!result.ok) {
          console.warn(`[registry] dropped ${manifestUrl}: ${result.reason}`);
          return null;
        }
        return result.app;
      } catch (e) {
        console.warn(`[registry] dropped ${manifestUrl}: ${(e as Error).message}`);
        return null;
      }
    }),
  );

  return resolved.filter((a): a is AppRuntimeInfo => a !== null);
}
