import { BrowserWindow } from 'electron';
import type { Config } from '../config';

/**
 * The shell window (04 §6, 07 §5). webviewTag enabled so content apps embed as
 * <webview>; contextIsolation on, nodeIntegration off. The guest preload path is
 * handed to the shell preload via additionalArguments so the <webview preload>
 * attribute can point at it. Shows immediately with the shell splash.
 */
export function createMainWindow(cfg: Config): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 640,
    backgroundColor: '#18181b',
    autoHideMenuBar: true,
    show: true,
    webPreferences: {
      preload: cfg.shellPreloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true,
      additionalArguments: [`--rwp2-guest-preload=${cfg.guestPreloadPath}`],
    },
  });

  void win.loadURL(cfg.shellUrl);
  return win;
}
