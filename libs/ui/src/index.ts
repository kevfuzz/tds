/**
 * @rwp2/ui — shared theming + dumb components (02 §2). Depends only on
 * @rwp2/contracts + Angular 21 (peer). Optional for apps, mandatory for shell.
 *
 * Asset imports (not re-exported here — consumed directly by tooling/styles):
 *   import '@rwp2/ui/tokens.css';              // the --p-* semantic tokens
 *   @config '@rwp2/ui/tailwind-preset.js';     // Tailwind v4 preset
 */
export { rwp2AuraPreset } from './primeng-preset';

// Exported under both the short name and the `Rwp`-prefixed name apps/templates
// import by (selectors remain rwp-tag / rwp-empty-state / rwp-key-value-card).
export { Tag, Tag as RwpTag } from './lib/tag.component';
export type { TagSeverity } from './lib/tag.component';
export { EmptyState, EmptyState as RwpEmptyState } from './lib/empty-state.component';
export { KeyValueCard, KeyValueCard as RwpKeyValueCard } from './lib/key-value-card.component';
export type { KeyValueItem } from './lib/key-value-card.component';
