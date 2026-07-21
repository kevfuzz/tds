import type { CurrentUser, CustomerRef } from '@rwp2/contracts';

/** Deterministic fixtures used by MockHost and by app unit tests (06 §3). */

export const FIXTURE_USER: CurrentUser = {
  id: '4471',
  name: 'Sinéad Kelly',
  initials: 'SK',
  roles: ['csa', 'compliance'],
  permissions: [
    'app.customer-records',
    'app.work-queues',
    'app.forms',
    'forms.submit',
  ],
};

export const FIXTURE_CUSTOMER: CustomerRef = {
  trn: '3287645T',
  name: 'Aoife Ryan',
  type: 'Individual',
};
