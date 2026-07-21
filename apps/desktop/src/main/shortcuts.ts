import type { BrowserWindow, WebContents, Event, Input } from 'electron';
import type { ShellPush } from '@rwp2/contracts';

type ShortcutId = ShellPush['wb:shortcut']['id'];

function match(input: Input): ShortcutId | null {
  if (input.type !== 'keyDown') return null;
  const mod = input.control || input.meta;
  if (!mod) return null;
  const key = input.key.toLowerCase();
  if (key === 'k') return 'commandCenter';
  if (key === 'b') return 'toggleSidebar';
  return null;
}

/**
 * ⌘K / ⌘B must work while focus is inside a guest webview (04 §8). We subscribe
 * `before-input-event` on the shell's webContents and on every attached webview,
 * preventDefault the two accelerators, and relay `wb:shortcut` to the shell. No
 * globalShortcut (that would capture system-wide).
 */
export function installShortcuts(win: BrowserWindow, sendToShell: (id: ShortcutId) => void): void {
  const bind = (wc: WebContents): void => {
    wc.on('before-input-event', (event: Event, input: Input) => {
      const id = match(input);
      if (id) {
        event.preventDefault();
        sendToShell(id);
      }
    });
  };

  bind(win.webContents);
  win.webContents.on('did-attach-webview', (_e, wc) => bind(wc));
}
