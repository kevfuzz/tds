import nx from '@nx/eslint-plugin';

/**
 * Root ESLint flat config.
 *
 * Two guardrails from 02 §3 / §4 are normative:
 *  - @nx/enforce-module-boundaries: the scope tags below are the ONLY import
 *    graph allowed. contracts depends on nothing; content apps can never reach
 *    shell code or each other.
 *  - max-lines: warn at 200, error at 300 (generated files excluded).
 */
export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/node_modules', '**/*.gen.ts', '**/files/**', '**/*.template.*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            { sourceTag: 'scope:contracts', onlyDependOnLibsWithTags: [] },
            { sourceTag: 'scope:sdk', onlyDependOnLibsWithTags: ['scope:contracts'] },
            { sourceTag: 'scope:sdk-testing', onlyDependOnLibsWithTags: ['scope:contracts'] },
            { sourceTag: 'scope:ui', onlyDependOnLibsWithTags: ['scope:contracts'] },
            {
              sourceTag: 'scope:shell',
              onlyDependOnLibsWithTags: ['scope:contracts', 'scope:ui'],
            },
            { sourceTag: 'scope:desktop', onlyDependOnLibsWithTags: ['scope:contracts'] },
            {
              sourceTag: 'scope:content',
              onlyDependOnLibsWithTags: [
                'scope:contracts',
                'scope:sdk',
                'scope:sdk-testing',
                'scope:ui',
              ],
            },
          ],
        },
      ],
    },
  },
  {
    // 02 §4 file budget. Generated files (EJS templates, *.gen.ts) excluded above.
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['**/*.spec.ts', '**/*.test.ts'],
    rules: {
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
];
