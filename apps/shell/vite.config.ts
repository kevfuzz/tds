/// <reference types='vitest' />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

// Vitest config for the shell. jsdom so component/DOM specs and the
// WebviewContentHost contract test (05 §7) can run without Electron.
export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/shell',
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/shell',
      provider: 'v8',
    },
  },
});
