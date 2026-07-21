/** 03 §6 — sender validation registry. Pure (no Electron): the router resolves
 *  every IPC sender through this map, so `tabId`/`appId` are never trusted from
 *  payloads and unregistered webContents can invoke nothing. */

export type SenderInfo =
  | { kind: 'shell' }
  | { kind: 'guest'; appId: string; tabId: string };

export class SenderRegistry {
  private readonly byId = new Map<number, SenderInfo>();
  private readonly guestByTab = new Map<string, number>();

  registerShell(webContentsId: number): void {
    this.byId.set(webContentsId, { kind: 'shell' });
  }

  registerGuest(webContentsId: number, appId: string, tabId: string): void {
    this.byId.set(webContentsId, { kind: 'guest', appId, tabId });
    this.guestByTab.set(tabId, webContentsId);
  }

  unregister(webContentsId: number): void {
    const info = this.byId.get(webContentsId);
    if (info?.kind === 'guest') this.guestByTab.delete(info.tabId);
    this.byId.delete(webContentsId);
  }

  /** Reverse lookup so main can push a scoped GuestPush straight to one guest. */
  guestWebContentsId(tabId: string): number | undefined {
    return this.guestByTab.get(tabId);
  }

  resolve(webContentsId: number): SenderInfo | undefined {
    return this.byId.get(webContentsId);
  }

  /** Throws unless the sender is a registered guest. Guest-only channels use this. */
  requireGuest(webContentsId: number): { kind: 'guest'; appId: string; tabId: string } {
    const info = this.byId.get(webContentsId);
    if (!info || info.kind !== 'guest') {
      throw new Error(`sender ${webContentsId} is not a registered guest`);
    }
    return info;
  }

  /** Throws unless the sender is the shell. Shell-only channels use this. */
  requireShell(webContentsId: number): void {
    const info = this.byId.get(webContentsId);
    if (!info || info.kind !== 'shell') {
      throw new Error(`sender ${webContentsId} is not the shell`);
    }
  }
}
