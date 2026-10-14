import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PERMISSIONS, type PlatformPlan, type TenantBillingInfoDto } from '@brics/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TenantBillingTab } from '../components/tenant-billing-tab';

const sessionMock = vi.fn();
vi.mock('@/features/auth/use-auth', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/use-auth')>('@/features/auth/use-auth');
  return { ...actual, useSession: () => sessionMock() };
});

const fetchTenantBillingMock = vi.fn();
const fetchPlatformPlansMock = vi.fn();
const updateTenantSubscriptionMock = vi.fn();
const createPlatformInvoiceMock = vi.fn();
const recordPlatformPaymentMock = vi.fn();

vi.mock('../api', () => ({
  fetchTenantBilling: (tenantId: string) => fetchTenantBillingMock(tenantId),
  fetchPlatformPlans: () => fetchPlatformPlansMock(),
  updateTenantSubscription: (id: string, dto: unknown) => updateTenantSubscriptionMock(id, dto),
  createPlatformInvoice: (tenantId: string, dto: unknown) => createPlatformInvoiceMock(tenantId, dto),
  recordPlatformPayment: (invoiceId: string, dto: unknown) => recordPlatformPaymentMock(invoiceId, dto),
}));

const MOCK_PLANS: PlatformPlan[] = [
  {
    code: 'starter',
    name: 'Starter',
    description: 'Essential brick kiln operations',
    priceMonthly: '2999.00',
    priceYearly: '29990.00',
    maxKilns: 1,
    maxUsers: 5,
    features: ['1 Production Kiln'],
  },
  {
    code: 'growth',
    name: 'Growth',
    description: 'Multi-site operations',
    priceMonthly: '5999.00',
    priceYearly: '59990.00',
    maxKilns: 3,
    maxUsers: 15,
    features: ['Up to 3 Kilns'],
  },
  {
    code: 'enterprise',
    name: 'Enterprise',
    description: 'Unlimited scale',
    priceMonthly: '11999.00',
    priceYearly: '119990.00',
    maxKilns: null,
    maxUsers: null,
    features: ['Unlimited Kilns'],
  },
];

const MOCK_BILLING: TenantBillingInfoDto = {
  tenantId: 'tenant-1',
  tenantName: 'Ganga Brickworks',
  planName: 'growth',
  status: 'active',
  subscriptionStatus: 'active',
  billingCycle: 'monthly',
  trialEndsAt: null,
  gracePeriodDays: 7,
  currentPlan: MOCK_PLANS[1] ?? null,
  invoices: [
    {
      id: 'inv-1',
      companyId: 'tenant-1',
      invoiceNumber: 'INV-2026-001',
      amount: '5999.00',
      taxAmount: '1079.82',
      totalAmount: '7078.82',
      status: 'pending',
      planName: 'growth',
      billingCycle: 'monthly',
      periodStart: '2026-10-01',
      periodEnd: '2026-10-31',
      dueDate: '2026-10-15',
      paidAt: null,
      paymentMethod: null,
      paymentRef: null,
      notes: null,
      createdAt: '2026-10-01T00:00:00.000Z',
    },
    {
      id: 'inv-2',
      companyId: 'tenant-1',
      invoiceNumber: 'INV-2026-002',
      amount: '5999.00',
      taxAmount: '1079.82',
      totalAmount: '7078.82',
      status: 'paid',
      planName: 'growth',
      billingCycle: 'monthly',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
      dueDate: '2026-09-15',
      paidAt: '2026-09-10T12:00:00.000Z',
      paymentMethod: 'upi',
      paymentRef: 'UPI-99887766',
      notes: 'Paid via UPI',
      createdAt: '2026-09-01T00:00:00.000Z',
    },
  ],
};

function renderBillingTab(tenantId = 'tenant-1') {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <TenantBillingTab tenantId={tenantId} />
    </QueryClientProvider>,
  );
}

describe('TenantBillingTab (PLT-11 / S4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionMock.mockReturnValue({
      can: (p: string) => p === PERMISSIONS.PLATFORM_TENANTS_MANAGE,
      user: { roleCode: 'platform_admin' },
      company: null,
    });
    fetchPlatformPlansMock.mockResolvedValue(MOCK_PLANS);
    fetchTenantBillingMock.mockResolvedValue(MOCK_BILLING);
  });

  it('renders subscription summary, plan details, limits and status badge', async () => {
    renderBillingTab();

    expect(await screen.findByText('Growth Plan')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText(/₹5999\.00 \/ mo/i)).toBeInTheDocument();
    expect(screen.getByText(/3 kilns/i)).toBeInTheDocument();
    expect(screen.getByText(/15 users/i)).toBeInTheDocument();
    expect(screen.getByText(/7 days/i)).toBeInTheDocument();
  });

  it('renders invoices table with amounts, status badges and payment records', async () => {
    renderBillingTab();

    expect(await screen.findByText('INV-2026-001')).toBeInTheDocument();
    expect(screen.getByText('INV-2026-002')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.getByText('PAID')).toBeInTheDocument();
    expect(screen.getByText('UPI-99887766')).toBeInTheDocument();
    expect(screen.getAllByText('₹7078.82')).toHaveLength(2);

    // Pending invoice should have a Record payment button
    expect(screen.getByRole('button', { name: /record payment for inv-2026-001/i })).toBeInTheDocument();
  });

  it('renders empty state when there are no platform invoices', async () => {
    fetchTenantBillingMock.mockResolvedValue({
      ...MOCK_BILLING,
      invoices: [],
    });

    renderBillingTab();

    expect(await screen.findByText(/no platform invoices/i)).toBeInTheDocument();
    expect(screen.getByText(/no invoices have been issued for this tenant yet/i)).toBeInTheDocument();
  });

  it('hides management action buttons when user lacks PLATFORM_TENANTS_MANAGE permission', async () => {
    sessionMock.mockReturnValue({
      can: () => false,
      user: { roleCode: 'platform_support' },
      company: null,
    });

    renderBillingTab();

    await screen.findByText('Growth Plan');
    expect(screen.queryByRole('button', { name: /edit subscription/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /create invoice/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /record payment/i })).not.toBeInTheDocument();
  });

  it('opens and submits Edit Subscription dialog', async () => {
    updateTenantSubscriptionMock.mockResolvedValue({
      ...MOCK_BILLING,
      planName: 'enterprise',
      subscriptionStatus: 'active',
    });

    renderBillingTab();

    const editBtn = await screen.findByRole('button', { name: /edit subscription/i });
    await userEvent.click(editBtn);

    expect(screen.getByRole('heading', { name: /edit subscription/i })).toBeInTheDocument();

    const planSelect = screen.getByLabelText(/^plan$/i);
    await userEvent.selectOptions(planSelect, 'enterprise');

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateTenantSubscriptionMock).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({
          planName: 'enterprise',
          billingCycle: 'monthly',
          subscriptionStatus: 'active',
        }),
      );
    });
  });

  it('opens Create Invoice dialog and supports auto-calculating 18% GST', async () => {
    createPlatformInvoiceMock.mockResolvedValue({
      id: 'inv-3',
      companyId: 'tenant-1',
      invoiceNumber: 'INV-2026-003',
      amount: '5999.00',
      taxAmount: '1079.82',
      totalAmount: '7078.82',
      status: 'pending',
    });

    renderBillingTab();

    const createBtn = await screen.findByRole('button', { name: 'Create Invoice' });
    await userEvent.click(createBtn);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: /create platform invoice/i })).toBeInTheDocument();

    // Base amount is pre-filled from growth plan: 5999.00
    const addGstBtn = within(dialog).getByRole('button', { name: /add 18% gst/i });
    await userEvent.click(addGstBtn);

    const taxInput = within(dialog).getByPlaceholderText('0.00');
    expect(taxInput).toHaveValue('1079.82');

    const submitBtn = within(dialog).getByRole('button', { name: /^create invoice$/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(createPlatformInvoiceMock).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({
          planName: 'growth',
          amount: '5999.00',
          taxAmount: '1079.82',
        }),
      );
    });
  });

  it('opens Record Payment dialog and records payment successfully', async () => {
    recordPlatformPaymentMock.mockResolvedValue({
      ...MOCK_BILLING.invoices[0],
      status: 'paid',
      paymentMethod: 'upi',
      paymentRef: 'UPI-TEST-1234',
    });

    renderBillingTab();

    const recordBtn = await screen.findByRole('button', {
      name: /record payment for inv-2026-001/i,
    });
    await userEvent.click(recordBtn);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: /record payment/i })).toBeInTheDocument();
    expect(within(dialog).getByText('INV-2026-001')).toBeInTheDocument();

    const refInput = within(dialog).getByLabelText(/payment reference \/ utr/i);
    await userEvent.type(refInput, 'UPI-TEST-1234');

    const confirmBtn = within(dialog).getByRole('button', { name: /confirm payment/i });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(recordPlatformPaymentMock).toHaveBeenCalledWith(
        'inv-1',
        expect.objectContaining({
          paymentMethod: 'upi',
          paymentRef: 'UPI-TEST-1234',
        }),
      );
    });
  });
});
