import { z } from 'zod';

/**
 * 03 — zod schemas ship beside the types. Main validates every remote payload
 * (session, registry, manifest, customer-menu) and drops+logs invalid entries
 * rather than failing the boot (04 §2).
 */

export const currentUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  initials: z.string(),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
});

export const customerRefSchema = z.object({
  trn: z.string(),
  name: z.string(),
  type: z.enum(['Individual', 'Company']),
});

export const navigationTargetSchema: z.ZodType<import('./navigation').NavigationTarget> = z.lazy(
  () =>
    z.object({
      appId: z.string(),
      path: z.string(),
      params: z.record(z.string()).optional(),
      customer: customerRefSchema.optional(),
      openMode: z.enum(['reuse', 'newTab', 'window']).optional(),
      label: z.string().optional(),
    }),
);

// MenuNode is recursive (children) → typed lazy schema.
export const menuNodeSchema: z.ZodType<import('./menu').MenuNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string(),
    icon: z.string().optional(),
    group: z.string(),
    order: z.number().optional(),
    target: navigationTargetSchema.optional(),
    children: z.array(menuNodeSchema).optional(),
    badge: z.string().optional(),
  }),
);

export const customerMenuResponseSchema = z.object({
  items: z.array(menuNodeSchema),
  ttlSeconds: z.number().optional(),
});

export const appManifestSchema = z.object({
  contractVersion: z.number().int(),
  id: z
    .string()
    .regex(/^[a-z][a-z0-9-]*$/, 'app id must be kebab-case'),
  name: z.string(),
  version: z.string(),
  entryUrl: z.string(),
  icon: z.string().regex(/^pi pi-[a-z-]+$/, "icon must be 'pi pi-*'"),
  integration: z.enum(['sdk', 'legacy']),
  requiredPermissions: z.array(z.string()).optional(),
  session: z.object({ partition: z.enum(['shared', 'isolated']) }).optional(),
  menu: z
    .object({
      static: z.array(menuNodeSchema).optional(),
      customerMenuUrl: z.string().optional(),
    })
    .optional(),
  healthUrl: z.string().optional(),
});

export const registrySchema = z.object({
  environment: z.string(),
  apps: z.array(z.object({ manifestUrl: z.string() })),
});

export const prefsSchema = z.object({
  theme: z.enum(['dark', 'light']),
  density: z.enum(['compact', 'comfortable']),
  groupTabsByCustomer: z.boolean(),
  alwaysOpenNewTab: z.boolean(),
  persona: z.string(),
});
