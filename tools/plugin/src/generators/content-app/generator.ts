import {
  formatFiles,
  generateFiles,
  joinPathFragments,
  names,
  readJson,
  Tree,
  writeJson,
} from '@nx/devkit';
import { appManifestSchema } from '@rwp2/contracts';
import type { ContentAppGeneratorSchema } from './schema';

const KEBAB = /^[a-z][a-z0-9-]*$/;
const ICON = /^pi pi-[a-z-]+$/;
const REGISTRY = 'tools/registry/registry.dev.json';

interface Normalized {
  name: string;
  displayName: string;
  icon: string;
  port: number;
  backendPort: number;
  customerMenu: boolean;
  standaloneRepo: boolean;
  className: string;
  projectRoot: string;
  manifestUrl: string;
}

/** Serve ports already claimed by existing apps — for collision + next-free scan. */
function usedPorts(tree: Tree): Set<number> {
  const ports = new Set<number>();
  for (const dir of tree.children('apps')) {
    const path = `apps/${dir}/project.json`;
    if (!tree.exists(path)) continue;
    const port = readJson<any>(tree, path)?.targets?.serve?.options?.port;
    if (typeof port === 'number') ports.add(port);
  }
  return ports;
}

/** App ids already declared by any manifest in the workspace. */
function usedIds(tree: Tree): Set<string> {
  const ids = new Set<string>();
  for (const dir of tree.children('apps')) {
    const path = `apps/${dir}/public/rwp2.manifest.json`;
    if (tree.exists(path)) ids.add(readJson<any>(tree, path).id);
  }
  return ids;
}

function titleCase(kebab: string): string {
  return kebab
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function normalize(tree: Tree, options: ContentAppGeneratorSchema): Normalized {
  const name = options.name?.trim() ?? '';
  if (!KEBAB.test(name)) {
    throw new Error(`--name must be kebab-case (^[a-z][a-z0-9-]*$); got "${options.name}".`);
  }
  const icon = options.icon ?? 'pi pi-box';
  if (!ICON.test(icon)) {
    throw new Error(`--icon must match 'pi pi-*'; got "${icon}".`);
  }
  if (usedIds(tree).has(name)) {
    throw new Error(`Duplicate app id "${name}" — already declared by another manifest.`);
  }
  const claimed = usedPorts(tree);
  if (options.port != null && claimed.has(options.port)) {
    throw new Error(`Port ${options.port} collides with an existing app's serve port.`);
  }
  let port = options.port;
  if (port == null) {
    port = 4201;
    while (claimed.has(port)) port++;
  }
  const standaloneRepo = options.standaloneRepo ?? false;
  return {
    name,
    displayName: options.displayName ?? titleCase(name),
    icon,
    port,
    backendPort: options.backendPort ?? port + 4000,
    customerMenu: options.customerMenu ?? true,
    standaloneRepo,
    className: names(name).className,
    projectRoot: standaloneRepo
      ? `dist/team-templates/content-${name}`
      : `apps/content-${name}`,
    manifestUrl: `http://localhost:${port}/rwp2.manifest.json`,
  };
}

/** Append the new app's manifest URL to the dev registry (created if absent). */
function updateRegistry(tree: Tree, opts: Normalized): void {
  const registry = tree.exists(REGISTRY)
    ? readJson<{ environment: string; apps: { manifestUrl: string }[] }>(tree, REGISTRY)
    : { environment: 'dev', apps: [] };
  registry.apps.push({ manifestUrl: opts.manifestUrl });
  writeJson(tree, REGISTRY, registry);
}

export default async function contentAppGenerator(
  tree: Tree,
  options: ContentAppGeneratorSchema,
): Promise<void> {
  const opts = normalize(tree, options);

  generateFiles(tree, joinPathFragments(__dirname, 'files'), opts.projectRoot, {
    ...opts,
    tmpl: '',
  });

  if (!opts.standaloneRepo) {
    updateRegistry(tree, opts);
  }

  // 08 §3.6 — assert our own stamped manifest is zod-valid before returning.
  const manifest = readJson(tree, joinPathFragments(opts.projectRoot, 'public/rwp2.manifest.json'));
  appManifestSchema.parse(manifest);

  await formatFiles(tree);
}
