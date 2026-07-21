import type { AppRuntimeInfo, CurrentUser, CustomerRef } from '@rwp2/contracts';

export const USER: CurrentUser = {
  id: '4471',
  name: 'Sinéad Kelly',
  initials: 'SK',
  roles: ['csa'],
  permissions: ['app.customer-records', 'app.work-queues', 'app.forms'],
};

export const ACME: CustomerRef = { trn: '3287645T', name: 'Acme Ltd', type: 'Company' };
export const BLOGGS: CustomerRef = { trn: '9911223W', name: 'Joe Bloggs', type: 'Individual' };

export function app(id: string, extra: Partial<AppRuntimeInfo['manifest']> = {}): AppRuntimeInfo {
  return {
    manifest: {
      contractVersion: 1,
      id,
      name: id.replace(/-/g, ' '),
      version: '1.0.0',
      entryUrl: `https://apps.rev/${id}/`,
      icon: 'pi pi-box',
      integration: 'sdk',
      ...extra,
    },
    origin: `https://apps.rev`,
    menuStatus: 'ok',
  };
}

export const APPS: AppRuntimeInfo[] = [app('customer-records'), app('work-queues'), app('forms')];
