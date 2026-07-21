import { contextBridge, ipcRenderer } from 'electron';
import type { Commands, ShellHostApi, ShellPush } from '@rwp2/contracts';

/**
 * shell.preload — injects window.rwp2Shell (ShellHostApi) into the shell
 * renderer (02 §1). The full typed command surface plus subscription to
 * ShellPush channels. The guest preload's absolute path is passed by main via
 * additionalArguments so the shell can set it on each <webview preload>.
 */
function guestPreloadPath(): string {
  const arg = process.argv.find((a) => a.startsWith('--rwp2-guest-preload='));
  return arg ? arg.slice('--rwp2-guest-preload='.length) : '';
}

const api: ShellHostApi = {
  invoke: <C extends keyof Commands>(channel: C, payload: Commands[C]['in']) =>
    ipcRenderer.invoke(channel, payload) as Promise<Commands[C]['out']>,
  on<C extends keyof ShellPush>(channel: C, cb: (p: ShellPush[C]) => void) {
    const listener = (_e: unknown, p: ShellPush[C]) => cb(p);
    ipcRenderer.on(channel, listener as never);
    return () => ipcRenderer.removeListener(channel, listener as never);
  },
  guestPreloadPath: guestPreloadPath(),
};

contextBridge.exposeInMainWorld('rwp2Shell', api);
