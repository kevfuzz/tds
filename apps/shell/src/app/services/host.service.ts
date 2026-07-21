import { Injectable } from '@angular/core';
import type { Commands, ShellHostApi, ShellPush } from '@rwp2/contracts';

/**
 * The ONLY file in the shell that touches `window.rwp2Shell` (02 §4).
 * A thin, fully-typed wrapper over `ShellHostApi`; every component reaches main
 * through `NavigationService`, never through here directly.
 *
 * When the bridge is absent (browser dev / unit tests) the shell stays on the
 * splash screen: `available` is false and callers simply do not invoke.
 */
@Injectable({ providedIn: 'root' })
export class HostService {
  private get bridge(): ShellHostApi {
    const b = window.rwp2Shell;
    if (!b) {
      throw new Error('rwp2Shell bridge unavailable — the shell must run inside the Electron host');
    }
    return b;
  }

  /** True when running inside the Electron host that injected the bridge. */
  get available(): boolean {
    return !!window.rwp2Shell;
  }

  /** Absolute path handed to the `<webview preload>` attribute (05 §4). */
  get guestPreloadPath(): string {
    return window.rwp2Shell?.guestPreloadPath ?? '';
  }

  invoke<C extends keyof Commands>(channel: C, payload: Commands[C]['in']): Promise<Commands[C]['out']> {
    return this.bridge.invoke(channel, payload);
  }

  on<C extends keyof ShellPush>(channel: C, cb: (p: ShellPush[C]) => void): () => void {
    if (!this.available) return () => undefined;
    return this.bridge.on(channel, cb);
  }
}
