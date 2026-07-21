import { describe, expect, it } from 'vitest';
import { SenderRegistry } from './senders';

describe('SenderRegistry validation (03 §6)', () => {
  it('rejects a guest-only channel from the shell sender', () => {
    const r = new SenderRegistry();
    r.registerShell(1);
    expect(() => r.requireGuest(1)).toThrow();
  });

  it('rejects any sender that is not registered', () => {
    const r = new SenderRegistry();
    expect(() => r.requireGuest(99)).toThrow();
    expect(() => r.requireShell(99)).toThrow();
  });

  it('resolves a registered guest and its reverse tab lookup', () => {
    const r = new SenderRegistry();
    r.registerGuest(7, 'customer-records', 't3');
    expect(r.requireGuest(7)).toEqual({ kind: 'guest', appId: 'customer-records', tabId: 't3' });
    expect(r.guestWebContentsId('t3')).toBe(7);
  });

  it('unregister clears both the id and the reverse tab lookup', () => {
    const r = new SenderRegistry();
    r.registerGuest(7, 'forms', 't3');
    r.unregister(7);
    expect(r.resolve(7)).toBeUndefined();
    expect(r.guestWebContentsId('t3')).toBeUndefined();
  });
});
