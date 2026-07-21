import { net } from 'electron';
import { currentUserSchema, type CurrentUser } from '@rwp2/contracts';
import type { Config } from '../config';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * D6 / 04 §2 — block on GET /api/session/current before any content loads.
 * net.fetch goes through the Electron session so OS SSO / Kerberos cookies
 * apply. Retry with exponential backoff; a hard failure is fatal (caller shows
 * the blocking error screen).
 */
export async function fetchCurrentUser(
  cfg: Config,
  onFatal: (e: unknown) => void = () => undefined,
): Promise<CurrentUser> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await net.fetch(cfg.sessionUrl, { credentials: 'include' });
      if (!res.ok) throw new Error(`session ${res.status}`);
      return currentUserSchema.parse(await res.json());
    } catch (e) {
      if (attempt >= 4) {
        onFatal(e);
        throw e;
      }
      await delay(500 * 2 ** attempt);
    }
  }
}
