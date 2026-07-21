import { describe, expect, it } from 'vitest';
import {
  appManifestSchema,
  customerMenuResponseSchema,
  currentUserSchema,
  menuNodeSchema,
  registrySchema,
} from './schemas';
import { CONTRACT_VERSION } from './version';

describe('schema round-trips (07 §4)', () => {
  it('accepts a valid CurrentUser', () => {
    const user = {
      id: '4471',
      name: 'Sinéad Kelly',
      initials: 'SK',
      roles: ['csa'],
      permissions: ['app.customer-records'],
    };
    expect(currentUserSchema.parse(user)).toEqual(user);
  });

  it('accepts a valid app manifest and rejects a bad icon / id', () => {
    const manifest = {
      contractVersion: CONTRACT_VERSION,
      id: 'customer-records',
      name: 'Customer records',
      version: '1.8.0',
      entryUrl: './',
      icon: 'pi pi-id-card',
      integration: 'sdk',
      requiredPermissions: ['app.customer-records'],
      menu: {
        static: [
          {
            id: 'overview',
            label: 'Overview',
            icon: 'pi pi-user',
            group: 'registrations',
            order: 0,
            target: { appId: 'customer-records', path: '/overview' },
          },
        ],
        customerMenuUrl: '/api/customer-records/workbench/menu?trn={trn}&persona={persona}',
      },
      healthUrl: '/actuator/health',
    };
    expect(appManifestSchema.parse(manifest).id).toBe('customer-records');
    expect(() => appManifestSchema.parse({ ...manifest, icon: 'rocket' })).toThrow();
    expect(() => appManifestSchema.parse({ ...manifest, id: 'Customer_Records' })).toThrow();
  });

  it('validates nested/recursive menu nodes', () => {
    const node = {
      id: 'financials',
      label: 'Financials',
      group: 'financials',
      children: [
        {
          id: 'bank',
          label: 'Bank details',
          group: 'financials',
          target: { appId: 'customer-records', path: '/bank' },
        },
      ],
    };
    expect(menuNodeSchema.parse(node).children).toHaveLength(1);
  });

  it('validates a customer-menu response and a registry', () => {
    expect(customerMenuResponseSchema.parse({ items: [], ttlSeconds: 300 }).items).toEqual([]);
    expect(
      registrySchema.parse({ environment: 'dev', apps: [{ manifestUrl: 'http://x/m.json' }] })
        .apps,
    ).toHaveLength(1);
  });
});
