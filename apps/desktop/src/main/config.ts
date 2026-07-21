import { join } from 'node:path';

export interface Config {
  registryUrl: string;
  sessionUrl: string;
  /** file:// dev URL for the shell, or packaged index.html path. */
  shellUrl: string;
  guestPreloadPath: string;
  shellPreloadPath: string;
  isDev: boolean;
}

/**
 * Environment → config (02 §1 config.ts). The installer embeds only the prod
 * registry URL; both are overridable by env var for support (07 §2).
 */
export function loadConfig(): Config {
  const isDev = !!process.env.ELECTRON_START_URL || process.env.NODE_ENV === 'development';
  const preloadDir = join(__dirname, '..', 'preload');
  return {
    registryUrl:
      process.env.RWP2_REGISTRY_URL ?? 'https://config.rev.internal/rwp2/prod/registry.json',
    sessionUrl: process.env.RWP2_SESSION_URL ?? '/api/session/current',
    shellUrl:
      process.env.ELECTRON_START_URL ?? `file://${join(__dirname, '..', 'shell', 'index.html')}`,
    guestPreloadPath: join(preloadDir, 'guest.preload.js'),
    shellPreloadPath: join(preloadDir, 'shell.preload.js'),
    isDev,
  };
}
