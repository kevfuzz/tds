import { describe, expect, it, vi } from 'vitest';
import type { AppRuntimeInfo, ContentHostEvent } from '@rwp2/contracts';
import type { HostService } from '../services/host.service';
import { WebviewContentHost, type WebviewElement } from './webview-content-host';

/** A fake element implementing the webview surface (05 §7). */
function makeFakeWebview(): WebviewElement & { send: ReturnType<typeof vi.fn>; reload: ReturnType<typeof vi.fn> } {
  const el = document.createElement('div') as unknown as WebviewElement & {
    send: ReturnType<typeof vi.fn>;
    reload: ReturnType<typeof vi.fn>;
  };
  el.getWebContentsId = () => 42;
  el.send = vi.fn();
  el.reload = vi.fn();
  return el;
}

function makeHost() {
  const invoke = vi.fn().mockResolvedValue(undefined);
  return { host: { invoke, guestPreloadPath: '/p/guest.js', available: true } as unknown as HostService, invoke };
}

function appInfo(partition?: 'shared' | 'isolated'): AppRuntimeInfo {
  return {
    manifest: {
      contractVersion: 1, id: 'customer-records', name: 'Customer records', version: '1.0.0',
      entryUrl: 'https://apps.rev/cr/', icon: 'pi pi-user', integration: 'sdk',
      ...(partition ? { session: { partition } } : {}),
    },
    origin: 'https://apps.rev',
    menuStatus: 'ok',
  };
}

function fire(el: HTMLElement, type: string, props: Record<string, unknown> = {}): void {
  const e = new Event(type);
  Object.assign(e, props);
  el.dispatchEvent(e);
}

describe('WebviewContentHost', () => {
  it('configures the webview and picks the shared partition by default', () => {
    const el = makeFakeWebview();
    const container = document.createElement('div');
    const { host } = makeHost();
    new WebviewContentHost(container, 't1', appInfo(), host, () => el);

    expect(el.getAttribute('partition')).toBe('persist:rwp2');
    expect(el.getAttribute('preload')).toBe('file:///p/guest.js');
    expect(el.getAttribute('allowpopups')).toBe('false');
    expect(container.contains(el)).toBe(true);
  });

  it('uses an isolated partition for isolated apps', () => {
    const el = makeFakeWebview();
    const { host } = makeHost();
    new WebviewContentHost(document.createElement('div'), 't1', appInfo('isolated'), host, () => el);
    expect(el.getAttribute('partition')).toBe('persist:rwp2-app-customer-records');
  });

  it('reports attach with the webContentsId before app code runs', () => {
    const el = makeFakeWebview();
    const { host, invoke } = makeHost();
    new WebviewContentHost(document.createElement('div'), 't1', appInfo(), host, () => el);

    fire(el, 'did-attach');
    expect(invoke).toHaveBeenCalledWith('wb:guestEvent', { tabId: 't1', type: 'attached', webContentsId: 42 });
  });

  it('emits loaded/crashed on the stream and to main', () => {
    const el = makeFakeWebview();
    const { host, invoke } = makeHost();
    const h = new WebviewContentHost(document.createElement('div'), 't1', appInfo(), host, () => el);
    const events: ContentHostEvent[] = [];
    h.events$.subscribe((e) => events.push(e));

    fire(el, 'dom-ready');
    fire(el, 'render-process-gone', { reason: 'oom' });

    expect(events).toEqual([
      { tabId: 't1', type: 'loaded' },
      { tabId: 't1', type: 'crashed', reason: 'oom' },
    ]);
    expect(invoke).toHaveBeenCalledWith('wb:guestEvent', { tabId: 't1', type: 'loaded' });
    expect(invoke).toHaveBeenCalledWith('wb:guestEvent', { tabId: 't1', type: 'crashed', reason: 'oom' });
  });

  it('ignores aborted loads (-3) but reports real main-frame failures', () => {
    const el = makeFakeWebview();
    const { host } = makeHost();
    const h = new WebviewContentHost(document.createElement('div'), 't1', appInfo(), host, () => el);
    const events: ContentHostEvent[] = [];
    h.events$.subscribe((e) => events.push(e));

    fire(el, 'did-fail-load', { errorCode: -3, isMainFrame: true, validatedURL: 'x' });
    fire(el, 'did-fail-load', { errorCode: -105, isMainFrame: false, validatedURL: 'sub' });
    expect(events).toEqual([]);

    fire(el, 'did-fail-load', { errorCode: -105, isMainFrame: true, validatedURL: 'https://apps.rev/cr/' });
    expect(events).toEqual([{ tabId: 't1', type: 'load-failed', code: -105, url: 'https://apps.rev/cr/' }]);
  });

  it('drives load/reload/postToGuest and visibility onto the element', () => {
    const el = makeFakeWebview();
    const container = document.createElement('div');
    const { host } = makeHost();
    const h = new WebviewContentHost(container, 't1', appInfo(), host, () => el);

    h.load('https://apps.rev/cr/#/bank/3287645T');
    expect(el.src).toBe('https://apps.rev/cr/#/bank/3287645T');

    h.postToGuest('wb:navigateInPlace', { appId: 'customer-records', path: '/x' });
    expect(el.send).toHaveBeenCalledWith('wb:navigateInPlace', { appId: 'customer-records', path: '/x' });

    h.hide();
    expect(container.style.visibility).toBe('hidden');
    h.show();
    expect(container.style.visibility).toBe('visible');

    h.reload();
    expect(el.reload).toHaveBeenCalled();
  });
});
