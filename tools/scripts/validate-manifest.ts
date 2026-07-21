#!/usr/bin/env node
/**
 * CI manifest-validity check (07 §4). Validates every content app's
 * public/rwp2.manifest.json against the normative zod schema and enforces the
 * cross-app invariant that app ids are unique. Exits non-zero on any failure.
 *
 * Usage: tsx tools/scripts/validate-manifest.ts [glob...]
 * Default glob: apps/content-*​/public/rwp2.manifest.json
 */
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { appManifestSchema, CONTRACT_VERSION } from '@rwp2/contracts';

const patterns = process.argv.slice(2);
const files = patterns.length
  ? patterns
  : globSync('apps/content-*/public/rwp2.manifest.json');

let failures = 0;
const seenIds = new Map<string, string>();

for (const file of files) {
  try {
    const parsed = appManifestSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
    if (parsed.contractVersion > CONTRACT_VERSION) {
      throw new Error(`contractVersion ${parsed.contractVersion} > shell ${CONTRACT_VERSION}`);
    }
    const prior = seenIds.get(parsed.id);
    if (prior) throw new Error(`duplicate app id '${parsed.id}' (also in ${prior})`);
    seenIds.set(parsed.id, file);
    console.log(`✓ ${file} (${parsed.id})`);
  } catch (e) {
    failures++;
    console.error(`✗ ${file}: ${(e as Error).message}`);
  }
}

if (failures) {
  console.error(`\n${failures} manifest(s) invalid`);
  process.exit(1);
}
console.log(`\n${files.length} manifest(s) valid`);
