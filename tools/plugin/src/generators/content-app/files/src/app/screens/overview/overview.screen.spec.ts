import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Workbench, provideWorkbench } from '@rwp2/sdk';
import { FIXTURE_CUSTOMER, FIXTURE_USER } from '@rwp2/sdk-testing';
import { OverviewScreen } from './overview.screen';

/**
 * Standalone unit test — no shell, no bridge. provideWorkbench() installs the
 * MockHost from @rwp2/sdk-testing, seeded with the fixture user + customer.
 */
describe('OverviewScreen', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideWorkbench({
          standalone: {
            user: FIXTURE_USER,
            context: {
              customer: FIXTURE_CUSTOMER,
              persona: 'csa',
              theme: 'light',
              density: 'comfortable',
              locale: 'en-IE',
            },
          },
        }),
      ],
    });
  });

  it('renders the fixture customer from Workbench.context', () => {
    const fixture = TestBed.createComponent(OverviewScreen);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(FIXTURE_CUSTOMER.name);
  });

  it('navigate() opens the VAT3 form in the forms app', () => {
    const wb = TestBed.inject(Workbench);
    const spy = vi.spyOn(wb, 'navigate').mockResolvedValue(undefined);

    const fixture = TestBed.createComponent(OverviewScreen);
    fixture.detectChanges();
    fixture.componentInstance.openVat3();

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ appId: 'forms', path: '/vat3' }),
    );
  });
});
