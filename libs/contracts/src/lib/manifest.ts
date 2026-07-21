import type { MenuNode } from './menu';

/** 03 §5 — Manifest & registry. */

export interface AppManifest {
  contractVersion: number; // must be ≤ shell's CONTRACT_VERSION
  id: string; // kebab-case, unique in registry
  name: string; // 'Customer records'
  version: string; // app's own semver, informational
  entryUrl: string; // absolute, or relative to the manifest URL
  icon: string; // 'pi pi-*'
  integration: 'sdk' | 'legacy';
  requiredPermissions?: string[]; // user needs ALL, else app is hidden entirely
  session?: { partition: 'shared' | 'isolated' }; // default 'shared' → 'persist:rwp2'
  menu?: {
    static?: MenuNode[];
    customerMenuUrl?: string; // template with {trn} {persona}
  };
  healthUrl?: string;
}

export interface Registry {
  environment: string; // 'dev' | 'staging' | 'prod'
  apps: { manifestUrl: string }[]; // order = default menu/app ordering
}
