import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { PlatformInvoiceDto, PlatformPlan, TenantBillingInfoDto } from '@brics/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TenantSubscriptionCard } from '../components/tenant-subscription-card';

const fetchCurrentTenantBillingMock = vi.fn();

vi.mock('../api', async () => {
  const actual = await vi.importActual<typeof import('../api')>('../api');
  return {
    ...actual,
    fetchCurrentTenantBilling: () => fetchCurrentTenantBillingMock(),
  };
});

const MOCK_PLAN: PlatformPlan = {
  code: 'starter',
  name: 'Starter',
  description: 'Essential brick kiln operations for single-site businesses',
  priceMonthly: '2999.00',
  priceYearly: '29990.00',
  maxKilns: 1,
  maxUsers: 5,
  features: ['1 Production Kiln', 'Up to 5 Users', 'GST & Accounting'],
};

const MOCK_INVOICES: PlatformInvoiceDto[] = [
  {
    id: 'inv-1',
    companyId: 'tenant-1',
    invoiceNumber: 'INV-2026-001',
    amount: '2999.00',
    taxAmount: '539.82',
    totalAmount: '3538.82',
    status: 'paid',
    planName: 'starter',
    billingCycle: 'monthly',
    periodStart: '2026-10-01',
    periodEnd: '2026-10-31',
    dueDate: '2026-10-15',
    paidAt: '2026-10-10T10:00:00.000Z',
    paymentMethod: 'upi',
    paymentRef: 'UPI-REF-9988',
    notes: null,
    createdAt: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'inv-2',
    companyId: 'tenant-1',
    invoiceNumber: 'INV-2026-002',
    amount: '2999.00',
    taxAmount: '539.82',
    totalAmount: '3538.82',
    status: 'pending',
    planName: 'starter',
    billingCycle: 'monthly',
    periodStart: '2026-11-01',
    periodEnd: '2026-11-30',
    dueDate: '2026-11-15',
    paidAt: null,
    paymentMethod: null,
    paymentRef: null,
    notes: null,
    createdAt: '2026-11-01T00:00:00.000Z',
  },
];

const MOCK_BILLING: TenantBillingInfoDto = {
  tenantId: 'tenant-1',
  tenantName: 'Varanasi Bricks',
  planName: 'starter',
  status: 'active',
  subscriptionStatus: 'active',
  billingCycle: 'monthly',
  trialEndsAt: null,
  gracePeriodDays: 7,
  currentPlan: MOCK_PLAN,
  invoices: MOCK_INVOICES,
};

function renderCard() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TenantSubscriptionCard />
    </QueryClientProvider>,
  );
}

describe('TenantSubscriptionCard (PLT-11 / S4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders plan name, subscription status badge, price, and plan features', async () => {
    fetchCurrentTenantBillingMock.mockResolvedValue(MOCK_BILLING);
    renderCard();

    await waitFor(() => {
      expect(screen.getByText('Subscription & Plan')).toBeInTheDocument();
      expect(screen.getByText('Starter')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('₹2,999 / month')).toBeInTheDocument();
    });

    expect(screen.getByText('1 Production Kiln')).toBeInTheDocument();
    expect(screen.getByText('Up to 5 Users')).toBeInTheDocument();
    expect(screen.getByText('GST & Accounting')).toBeInTheDocument();
    expect(
      screen.getByText(
        /To change your subscription plan or request billing assistance, please contact platform support/i,
      ),
    ).toBeInTheDocument();
  });

  it('renders invoice rows with amounts, dates, and statuses', async () => {
    fetchCurrentTenantBillingMock.mockResolvedValue(MOCK_BILLING);
    renderCard();

    await waitFor(() => {
      expect(screen.getByText('INV-2026-001')).toBeInTheDocument();
      expect(screen.getByText('INV-2026-002')).toBeInTheDocument();
    });

    // Verify invoice total amounts formatted as INR
    const amounts = screen.getAllByText('₹3,538.82');
    expect(amounts.length).toBe(2);

    // Verify status badges
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();

    // Verify payment details for paid invoice
    expect(screen.getByText(/Paid on 10 Oct 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/UPI • UPI-REF-9988/i)).toBeInTheDocument();
  });

  it('renders trial status badge and trial expiry with grace period', async () => {
    const trialBilling: TenantBillingInfoDto = {
      ...MOCK_BILLING,
      subscriptionStatus: 'trial',
      trialEndsAt: '2026-11-15',
      gracePeriodDays: 7,
    };
    fetchCurrentTenantBillingMock.mockResolvedValue(trialBilling);
    renderCard();

    await waitFor(() => {
      expect(screen.getByText('Trial')).toBeInTheDocument();
      expect(screen.getByText('Trial ends on 15 Nov 2026 (7 days grace period)')).toBeInTheDocument();
    });
  });

  it('renders past_due and canceled status badges appropriately', async () => {
    const pastDueBilling: TenantBillingInfoDto = {
      ...MOCK_BILLING,
      subscriptionStatus: 'past_due',
    };
    fetchCurrentTenantBillingMock.mockResolvedValue(pastDueBilling);
    renderCard();

    await waitFor(() => {
      expect(screen.getByText('Past Due')).toBeInTheDocument();
    });
  });

  it('renders canceled status badge appropriately', async () => {
    const canceledBilling: TenantBillingInfoDto = {
      ...MOCK_BILLING,
      subscriptionStatus: 'canceled',
    };
    fetchCurrentTenantBillingMock.mockResolvedValue(canceledBilling);
    renderCard();

    await waitFor(() => {
      expect(screen.getByText('Canceled')).toBeInTheDocument();
    });
  });

  it('displays empty state when there are no platform invoices', async () => {
    const emptyInvoicesBilling: TenantBillingInfoDto = {
      ...MOCK_BILLING,
      invoices: [],
    };
    fetchCurrentTenantBillingMock.mockResolvedValue(emptyInvoicesBilling);
    renderCard();

    await waitFor(() => {
      expect(screen.getByText('No platform invoices yet.')).toBeInTheDocument();
    });
  });

  it('displays skeleton state while loading', () => {
    fetchCurrentTenantBillingMock.mockImplementation(() => new Promise(() => {}));
    renderCard();

    expect(screen.getByRole('status', { name: /loading subscription details/i })).toBeInTheDocument();
  });

  it('displays alert error when query fails', async () => {
    fetchCurrentTenantBillingMock.mockRejectedValue(new Error('Network error loading subscription'));
    renderCard();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Network error loading subscription/i)).toBeInTheDocument();
    });
  });
});
