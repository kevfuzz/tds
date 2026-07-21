import { shell, type BrowserWindow } from 'electron';
import type { AppRuntimeInfo } from '@rwp2/contracts';

/**
 * Webview security policy (04 §6). Installed BEFORE any webview can attach. It
 * forces our guest preload regardless of the DOM attribute, disables node
 * integration, and allowlists `src`/navigation to known app origins so a guest
 * can never load off-origin or open arbitrary windows.
 */
export function installWebviewPolicy(
  win: BrowserWindow,
  apps: () => AppRuntimeInfo[],
  guestPreloadPath: string,
): void {
  win.webContents.on('will-attach-webview', (e, prefs, params) => {
    prefs.preload = guestPreloadPath; // force ours, whatever the DOM said
    prefs.nodeIntegration = false;
    prefs.contextIsolation = true;
    delete (prefs as { preloadURL?: string }).preloadURL;
    if (!apps().some((a) => params.src.startsWith(a.origin))) {
      e.preventDefault(); // allowlist
    }
  });

  win.webContents.on('did-attach-webview', (_e, wc) => {
    wc.setWindowOpenHandler(({ url }) => {
      void shell.openExternal(url);
      return { action: 'deny' };
    });
    wc.on('will-navigate', (evt, url) => {
      if (!apps().some((a) => url.startsWith(a.origin))) evt.preventDefault();
    });
  });
}

/** Session partition for an app (04 §6): shared SSO by default, else isolated. */
export function partitionFor(app: AppRuntimeInfo): string {
  return app.manifest.session?.partition === 'isolated'
    ? `persist:rwp2-app-${app.manifest.id}`
    : 'persist:rwp2';
}
