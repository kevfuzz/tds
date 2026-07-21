import { app, webContents, type BrowserWindow } from 'electron';
import type { GuestPush, GuestPushChannel, ShellPush, WorkbenchState } from '@rwp2/contracts';
import { loadConfig } from './config';
import { createMainWindow } from './windows/main-window';
import { installWebviewPolicy } from './windows/webview-policy';
import { installShortcuts } from './shortcuts';
import { WorkbenchStore } from './state/store';
import { SenderRegistry } from './ipc/senders';
import { MenuController } from './menu/menu-controller';
import { GuardedCloseCoordinator } from './ipc/close-coordinator';
import { createIpcRouter } from './ipc/router';
import { guestContext } from './state/selectors';
import { Persistence } from './state/persistence';
import { loadPersistedSlice } from './state/persistence';
import { restorableTargets } from './state/durable';
import { fetchCurrentUser } from './bootstrap/session';
import { loadRegistry } from './bootstrap/registry';
import type { Deps } from './ipc/deps';

/** Composition root (04 §1): wire modules and start the boot sequence. */
async function main(win: BrowserWindow): Promise<void> {
  const cfg = loadConfig();
  const store = new WorkbenchStore();
  const senders = new SenderRegistry();
  const menu = new MenuController(store);
  const persistence = new Persistence();

  const pushToShell = <C extends keyof ShellPush>(channel: C, payload: ShellPush[C]): void => {
    if (!win.isDestroyed()) win.webContents.send(channel, payload);
  };
  const pushToGuest = <C extends GuestPushChannel>(
    tabId: string,
    channel: C,
    payload: GuestPush[C],
  ): void => {
    const id = senders.guestWebContentsId(tabId);
    if (id !== undefined) webContents.fromId(id)?.send(channel, payload);
  };
  const broadcastContext = (state: WorkbenchState): void => {
    for (const tab of state.tabs) {
      if (tab.kind !== 'guest') continue;
      const ctx = guestContext(state, tab.id);
      if (ctx) pushToGuest(tab.id, 'wb:contextChanged', ctx);
    }
  };

  senders.registerShell(win.webContents.id);
  installWebviewPolicy(win, () => store.state.apps, cfg.guestPreloadPath);
  installShortcuts(win, (id) => pushToShell('wb:shortcut', { id }));

  const close = new GuardedCloseCoordinator(
    store,
    pushToGuest,
    (appId) => store.state.apps.find((a) => a.manifest.id === appId)?.manifest.integration === 'legacy',
  );

  const deps: Deps = {
    store,
    senders,
    menu,
    pushToGuest,
    pushToShell,
    broadcastContext,
    close,
    now: () => Date.now(),
  };
  createIpcRouter(deps);

  // Publish every state change to the shell; persist the durable slice.
  store.subscribe((next, patch) => {
    pushToShell('wb:stateChanged', patch);
    if ('context' in patch || 'user' in patch) broadcastContext(next);
    persistence.schedule(next);
  });

  // Boot: auth (blocking) → registry → apps → static menu → restore tabs.
  const user = await fetchCurrentUser(cfg, (e) => console.error('[auth] fatal', e));
  const apps = await loadRegistry(cfg, user);
  store.dispatch({ type: 'boot', user, apps });
  menu.recomputeStatic();
  await restoreTabs(store, cfg, apps.map((a) => a.manifest.id));
}

async function restoreTabs(
  store: WorkbenchStore,
  _cfg: unknown,
  knownAppIds: string[],
): Promise<void> {
  const slice = await loadPersistedSlice();
  if (!slice) return;
  const targets = restorableTargets(slice, new Set(knownAppIds));
  for (const target of targets) {
    store.dispatch({ type: 'openTarget', target, id: store.nextTabId(), now: Date.now() });
  }
  const active = store.state.tabs.find((t) => t.key === slice.activeTabKey);
  if (active) store.dispatch({ type: 'activateTab', tabId: active.id, now: Date.now() });
}

app.whenReady().then(() => {
  const cfg = loadConfig();
  const win = createMainWindow(cfg);
  void main(win).catch((e) => console.error('[main] boot failed', e));
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
