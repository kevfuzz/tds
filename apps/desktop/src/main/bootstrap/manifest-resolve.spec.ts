import { describe, expect, it } from 'vitest';
import type { AppManifest } from '@rwp2/contracts';
import { USER } from '../state/test-fixtures';
import { permitted, resolveApp } from './manifest-resolve';

const manifest = (extra: Partial<AppManifest> = {}): AppManifest => ({
  contractVersion: 1,
  id: 'customer-records',
  name: 'Customer records',
  version: '1.0.0',
  entryUrl: './',
  icon: 'pi pi-id-card',
  integration: 'sdk',
  ...extra,
});

describe('manifest resolution (04 §2)', () => {
  it('resolves a relative entryUrl against the manifest URL and computes origin', () => {
    const r = resolveApp(manifest(), 'https://apps.rev/customer-records/rwp2.manifest.json', USER, 1);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.app.manifest.entryUrl).toBe('https://apps.rev/customer-records/');
      expect(r.app.origin).toBe('https://apps.rev');
    }
  });

  it('drops a manifest requiring a newer contract', () => {
    const r = resolveApp(manifest({ contractVersion: 2 }), 'https://apps.rev/m.json', USER, 1);
    expect(r.ok).toBe(false);
  });

  it('hides an app the user lacks permission for', () => {
    const r = resolveApp(manifest({ requiredPermissions: ['app.secret'] }), 'https://apps.rev/m.json', USER, 1);
    expect(r.ok).toBe(false);
    expect(permitted(manifest({ requiredPermissions: ['app.customer-records'] }), USER)).toBe(true);
  });
});
