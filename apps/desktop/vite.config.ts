/// <reference types='vitest' />
import { defineConfig } from 'vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/desktop',
  plugins: [nxViteTsPaths()], // resolve @rwp2/* workspace aliases in specs
  test: {
    globals: true,
    environment: 'node',
    // Only the pure state/menu/ipc-logic modules are unit-tested; Electron-bound
    // files (windows, preloads, bootstrap net calls) are covered by the smoke e2e.
    include: ['src/**/*.{test,spec}.ts'],
    reporters: ['default'],
  },
});
