import type { AppMenuResult } from './aggregator';

/** Fill a customerMenuUrl template's {trn}/{persona} vars (03 §4). Pure. */
export function fillTemplate(url: string, vars: { trn: string; persona: string }): string {
  return url
    .replace(/\{trn\}/g, encodeURIComponent(vars.trn))
    .replace(/\{persona\}/g, encodeURIComponent(vars.persona));
}

interface Entry {
  result: AppMenuResult;
  expiresAt: number;
}

/**
 * Per-(appId,trn,persona) TTL cache for customer-menu results (04 §5). `now` is
 * injectable so the TTL logic is unit-testable without wall-clock flake.
 */
export class MenuCache {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  private key(appId: string, trn: string, persona: string): string {
    return `${appId}|${trn}|${persona}`;
  }

  get(appId: string, trn: string, persona: string): AppMenuResult | undefined {
    const e = this.entries.get(this.key(appId, trn, persona));
    if (!e) return undefined;
    if (e.expiresAt <= this.now()) {
      this.entries.delete(this.key(appId, trn, persona));
      return undefined;
    }
    return e.result;
  }

  put(
    result: AppMenuResult,
    trn: string,
    persona: string,
    ttlSeconds: number,
  ): AppMenuResult {
    this.entries.set(this.key(result.appId, trn, persona), {
      result,
      expiresAt: this.now() + ttlSeconds * 1000,
    });
    return result;
  }

  /** `wb:refreshAppMenu` retry affordance — drop this app's cached entries. */
  bust(appId: string): void {
    for (const k of this.entries.keys()) {
      if (k.startsWith(`${appId}|`)) this.entries.delete(k);
    }
  }
}
