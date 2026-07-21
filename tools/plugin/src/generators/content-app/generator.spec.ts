import { Tree, readJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { appManifestSchema } from '@rwp2/contracts';
import contentAppGenerator from './generator';

describe('content-app generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('stamps the 06-compliant tree', async () => {
    await contentAppGenerator(tree, { name: 'debt-management' });
    const root = 'apps/content-debt-management';
    for (const f of [
      'project.json',
      'proxy.conf.js',
      'public/rwp2.manifest.json',
      'src/main.ts',
      'src/app/app.config.ts',
      'src/app/app.routes.ts',
      'src/app/screens/overview/overview.screen.ts',
      'src/app/screens/overview/overview.screen.spec.ts',
    ]) {
      expect(tree.exists(`${root}/${f}`)).toBe(true);
    }
  });

  it('produces a zod-valid manifest with derived defaults', async () => {
    await contentAppGenerator(tree, { name: 'debt-management', icon: 'pi pi-briefcase' });
    const manifest = readJson(tree, 'apps/content-debt-management/public/rwp2.manifest.json');
    expect(() => appManifestSchema.parse(manifest)).not.toThrow();
    expect(manifest.id).toBe('debt-management');
    expect(manifest.name).toBe('Debt Management');
    expect(manifest.icon).toBe('pi pi-briefcase');
    expect(manifest.integration).toBe('sdk');
    expect(manifest.menu.customerMenuUrl).toContain('/api/debt-management/');
  });

  it('registers the app in registry.dev.json at its serve port', async () => {
    await contentAppGenerator(tree, { name: 'debt-management', port: 4210 });
    const registry = readJson(tree, 'tools/registry/registry.dev.json');
    expect(registry.apps).toContainEqual({
      manifestUrl: 'http://localhost:4210/rwp2.manifest.json',
    });
    const project = readJson(tree, 'apps/content-debt-management/project.json');
    expect(project.targets.serve.options.port).toBe(4210);
    expect(project.tags).toEqual(['scope:content']);
  });

  it('rejects invalid kebab-case names', async () => {
    await expect(contentAppGenerator(tree, { name: 'Debt_Management' })).rejects.toThrow(
      /kebab-case/,
    );
  });

  it('rejects a port collision with an existing app', async () => {
    await contentAppGenerator(tree, { name: 'debt-management', port: 4210 });
    await expect(
      contentAppGenerator(tree, { name: 'refunds', port: 4210 }),
    ).rejects.toThrow(/Port 4210/);
  });

  it('rejects a duplicate app id', async () => {
    await contentAppGenerator(tree, { name: 'debt-management' });
    await expect(contentAppGenerator(tree, { name: 'debt-management' })).rejects.toThrow(
      /Duplicate app id/,
    );
  });

  it('touches only the new project and the dev registry (affected-scope)', async () => {
    await contentAppGenerator(tree, { name: 'debt-management' });
    const changed = tree.listChanges().map((c) => c.path);
    for (const path of changed) {
      const scoped =
        path.startsWith('apps/content-debt-management/') ||
        path === 'tools/registry/registry.dev.json';
      expect(scoped, `unexpected write: ${path}`).toBe(true);
    }
  });
});
