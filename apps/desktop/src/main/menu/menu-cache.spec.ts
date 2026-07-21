import { describe, expect, it } from 'vitest';
import { fillTemplate, MenuCache } from './menu-cache';

describe('fillTemplate (03 §4)', () => {
  it('substitutes and url-encodes {trn} and {persona}', () => {
    const url = fillTemplate('/api/menu?trn={trn}&persona={persona}', {
      trn: '3287645T',
      persona: 'csa/lead',
    });
    expect(url).toBe('/api/menu?trn=3287645T&persona=csa%2Flead');
  });
});

describe('MenuCache TTL (04 §5)', () => {
  it('returns a cached entry within TTL and expires after it', () => {
    let now = 1000;
    const cache = new MenuCache(() => now);
    cache.put({ appId: 'a', status: 'ok', items: [] }, 'T', 'csa', 5); // 5s TTL
    expect(cache.get('a', 'T', 'csa')).toBeDefined();
    now = 1000 + 5000 + 1;
    expect(cache.get('a', 'T', 'csa')).toBeUndefined();
  });

  it('bust drops all entries for one app', () => {
    const cache = new MenuCache(() => 0);
    cache.put({ appId: 'a', status: 'ok', items: [] }, 'T1', 'csa', 300);
    cache.put({ appId: 'a', status: 'ok', items: [] }, 'T2', 'csa', 300);
    cache.bust('a');
    expect(cache.get('a', 'T1', 'csa')).toBeUndefined();
    expect(cache.get('a', 'T2', 'csa')).toBeUndefined();
  });
});
