import { contextBridge, ipcRenderer } from 'electron';
import {
  CONTRACT_VERSION,
  type CurrentUser,
  type GuestContext,
  type GuestHostApi,
  type MenuNode,
  type NavigationTarget,
} from '@rwp2/contracts';

/**
 * guest.preload — injects window.rwp2Host (GuestHostApi ONLY) into every guest
 * (04 §6). Every method maps 1:1 to a channel in 03 §6; there is NO generic
 * invoke escape hatch. Push channels (context/navigate/beforeClose) are received
 * via ipcRenderer.on and fanned out to registered callbacks.
 */
function makeApi(): GuestHostApi {
  const ctxCbs = new Set<(c: GuestContext) => void>();
  const navCbs = new Set<(t: NavigationTarget) => void>();
  let closeGuard: (() => boolean | Promise<boolean>) | null = null;

  ipcRenderer.on('wb:contextChanged', (_e, ctx: GuestContext) => ctxCbs.forEach((cb) => cb(ctx)));
  ipcRenderer.on('wb:navigateInPlace', (_e, t: NavigationTarget) => navCbs.forEach((cb) => cb(t)));
  ipcRenderer.on('wb:beforeClose', async (_e, { requestId }: { requestId: string }) => {
    let allow = true;
    try {
      allow = closeGuard ? await closeGuard() : true;
    } catch {
      allow = false;
    }
    ipcRenderer.invoke('wb:beforeCloseReply', { requestId, allow });
  });

  return {
    apiVersion: CONTRACT_VERSION,
    getUser: () => ipcRenderer.invoke('wb:getUser') as Promise<CurrentUser>,
    getContext: () => ipcRenderer.invoke('wb:getContext') as Promise<GuestContext>,
    onContextChanged(cb) {
      ctxCbs.add(cb);
      return () => ctxCbs.delete(cb);
    },
    onNavigateInPlace(cb) {
      navCbs.add(cb);
      return () => navCbs.delete(cb);
    },
    navigate: (target: NavigationTarget) => ipcRenderer.invoke('wb:navigate', target) as Promise<void>,
    openCustomer: (trn: string) => ipcRenderer.invoke('wb:openCustomer', { trn }) as Promise<void>,
    setDirty: (dirty: boolean) => void ipcRenderer.invoke('wb:setDirty', { dirty }),
    contributeMenu: (items: MenuNode[]) => void ipcRenderer.invoke('wb:contributeMenu', { items }),
    notify: (n) => void ipcRenderer.invoke('wb:notify', n),
    onBeforeClose(handler) {
      closeGuard = handler; // one handler max (03 §7)
      return () => {
        if (closeGuard === handler) closeGuard = null;
      };
    },
  };
}

contextBridge.exposeInMainWorld('rwp2Host', makeApi());
