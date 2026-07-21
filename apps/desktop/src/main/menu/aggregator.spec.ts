import { describe, expect, it } from 'vitest';
import type { MenuNode } from '@rwp2/contracts';
import { app } from '../state/test-fixtures';
import { aggregateMenu, type AppMenuResult } from './aggregator';

const staticNode = (id: string, group: string, order?: number): MenuNode => ({
  id,
  label: id,
  group,
  order,
});

describe('aggregateMenu (01 §6 / 04 §5)', () => {
  it('namespaces ids to <appId>/<id> so apps cannot collide', () => {
    const apps = [app('customer-records', { menu: { static: [staticNode('overview', 'registrations')] } })];
    const { menu } = aggregateMenu(apps, [], new Map());
    const leaf = menu[0].children![0];
    expect(leaf.id).toBe('customer-records/overview');
  });

  it('merges static ∪ REST ∪ live for one app', () => {
    const apps = [app('work-queues', { menu: { static: [staticNode('queues', 'profiles')] } })];
    const rest: AppMenuResult[] = [
      { appId: 'work-queues', status: 'ok', items: [staticNode('assigned', 'profiles')] },
    ];
    const live = new Map([['work-queues', [staticNode('draft-1', 'profiles')]]]);
    const { menu } = aggregateMenu(apps, rest, live);
    const ids = menu[0].children!.map((c) => c.id).sort();
    expect(ids).toEqual([
      'work-queues/assigned',
      'work-queues/draft-1',
      'work-queues/queues',
    ]);
  });

  it('orders by group rank, then registry/app order, then order field', () => {
    const apps = [
      app('customer-records', { menu: { static: [staticNode('a', 'financials', 1)] } }),
      app('forms', { menu: { static: [staticNode('b', 'registrations'), staticNode('c', 'financials', 0)] } }),
    ];
    const { menu } = aggregateMenu(apps, [], new Map());
    // registrations group ranks before financials
    expect(menu.map((g) => g.group)).toEqual(['registrations', 'financials']);
    // within financials: customer-records (app 0) before forms (app 1) despite order
    expect(menu[1].children!.map((c) => c.id)).toEqual(['customer-records/a', 'forms/c']);
  });

  it('isolates a failed app: its status is failed but static items still show', () => {
    const apps = [app('customer-records', { menu: { static: [staticNode('overview', 'registrations')] } })];
    const rest: AppMenuResult[] = [{ appId: 'customer-records', status: 'failed', items: [] }];
    const { menu, statuses } = aggregateMenu(apps, rest, new Map());
    expect(statuses['customer-records']).toBe('failed');
    expect(menu[0].children![0].id).toBe('customer-records/overview'); // static survives
  });
});
