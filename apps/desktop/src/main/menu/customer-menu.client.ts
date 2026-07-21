import { net } from 'electron';
import { customerMenuResponseSchema, type AppRuntimeInfo } from '@rwp2/contracts';
import type { AppMenuResult } from './aggregator';
import { fillTemplate, MenuCache } from './menu-cache';

/**
 * Fetch every app's per-customer menu in parallel, 2s timeout, per-app failure
 * isolation (04 §5): a failing app returns `status:'failed'` with no items — the
 * aggregator then shows only its static items and the sidebar offers a retry.
 */
export async function fetchCustomerMenus(
  apps: AppRuntimeInfo[],
  trn: string,
  persona: string,
  cache: MenuCache,
): Promise<AppMenuResult[]> {
  return Promise.all(
    apps.map(async (a): Promise<AppMenuResult> => {
      const appId = a.manifest.id;
      const url = a.manifest.menu?.customerMenuUrl;
      if (!url) return { appId, status: 'ok', items: [] };

      const cached = cache.get(appId, trn, persona);
      if (cached) return cached;

      try {
        const res = await net.fetch(fillTemplate(url, { trn, persona }), {
          signal: AbortSignal.timeout(2000),
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`menu ${res.status}`);
        const body = customerMenuResponseSchema.parse(await res.json());
        return cache.put({ appId, status: 'ok', items: body.items }, trn, persona, body.ttlSeconds ?? 300);
      } catch {
        return { appId, status: 'failed', items: [] };
      }
    }),
  );
}
