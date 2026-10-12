import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BillsPage from '@/app/(dashboard)/purchases/bills/page';
import PayablesPage from '@/app/(dashboard)/purchases/payables/page';
import type { PayablesAgeing, PurchaseBill } from '../api';

let granted: string[] = [];
const bills: PurchaseBill[] = [];
let ageing: PayablesAgeing;

vi.mock('@/features/auth/use-auth', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/use-auth')>('@/features/auth/use-auth');
  return {
    ...actual,
    useSession: () => ({
      can: (...codes: string[]) => codes.every((c) => granted.includes(c)),
      sites: [{ id: 's1', name: 'Kiln One' }],
    }),
  };
});

vi.mock('@/features/masters/hooks', () => ({
  useParties: () => ({ data: { items: [{ id: 'sup1', name: 'Bharat Coal Traders' }] } }),
  useItems: () => ({ data: { items: [{ id: 'i1', name: 'Coal', category: 'raw_material' }] } }),
  useWarehouses: () => ({ data: { items: [{ id: 'w1', name: 'Raw Yard' }] } }),
}));

vi.mock('@/features/accounting/hooks', () => ({
  useLedgers: () => ({ data: [{ id: 'cash', name: 'Cash', code: 'CASH' }] }),
}));

vi.mock('../api', () => ({
  fetchBills: () => Promise.resolve({ items: bills, meta: { page: 1, limit: 25, total: bills.length } }),
  fetchReceipts: () => Promise.resolve({ items: [], meta: { page: 1, limit: 25, total: 0 } }),
  fetchOrders: () => Promise.resolve({ items: [], meta: { page: 1, limit: 25, total: 0 } }),
  fetchPayablesAgeing: () => Promise.resolve(ageing),
  createBill: vi.fn(),
  createPayment: vi.fn(),
  createOrder: vi.fn(),
  createReceipt: vi.fn(),
  createReturn: vi.fn(),
  fetchBill: vi.fn(),
  fetchOrder: vi.fn(),
  fetchReceipt: vi.fn(),
}));

function bill(overrides: Partial<PurchaseBill> = {}): PurchaseBill {
  return {
    id: 'b1',
    supplierPartyId: 'sup1',
    siteId: 's1',
    supplierInvoiceNo: 'INV-1001',
    billDate: '2026-10-05',
    dueDate: '2026-06-01',
    grnId: null,
    taxableAmount: '500000.00',
    cgstAmount: '30000.00',
    sgstAmount: '30000.00',
    igstAmount: '0.00',
    totalAmount: '560000.00',
    paidAmount: '160000.00',
    voucherId: 'v1',
    ...overrides,
  };
}

function renderPage(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

/**
 * Paying a supplier is the one action here that moves money out, and it is
 * deliberately gated more tightly than the rest of the module.
 */
describe('Bills — who may pay', () => {
  it('offers Pay only to someone who may also post to the accounts', async () => {
    bills.length = 0;
    bills.push(bill());
    granted = ['purchases.view', 'purchases.manage', 'accounts.manage'];

    renderPage(<BillsPage />);
    expect(await screen.findAllByText('INV-1001')).not.toHaveLength(0);
    expect(screen.getAllByRole('button', { name: 'Pay' }).length).toBeGreaterThan(0);
  });

  it('withholds Pay from someone who may raise bills but not post', async () => {
    // A store keeper can receive goods and book the invoice; releasing the cash
    // is somebody else's signature.
    bills.length = 0;
    bills.push(bill());
    granted = ['purchases.view', 'purchases.manage'];

    renderPage(<BillsPage />);
    expect(await screen.findAllByText('INV-1001')).not.toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Pay' })).not.toBeInTheDocument();
    // And they still cannot see a New bill button? They can — that is manage.
    expect(screen.getAllByRole('button', { name: /New bill/ }).length).toBeGreaterThan(0);
  });

  it('shows a fully paid bill as settled rather than offering to pay it again', async () => {
    bills.length = 0;
    bills.push(bill({ paidAmount: '560000.00' }));
    granted = ['purchases.view', 'purchases.manage', 'accounts.manage'];

    renderPage(<BillsPage />);
    expect(await screen.findAllByText('Paid')).not.toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Pay' })).not.toBeInTheDocument();
  });

  it('shows what is still owed, not the full total', async () => {
    bills.length = 0;
    bills.push(bill());
    granted = ['purchases.view'];

    renderPage(<BillsPage />);
    // 560,000 billed less 160,000 paid.
    expect(await screen.findAllByText('₹4,00,000.00')).not.toHaveLength(0);
  });
});

describe('Payables ageing', () => {
  it('puts a long-overdue balance in the over-90 bucket and marks it', async () => {
    granted = ['purchases.view'];
    ageing = {
      asOf: '2026-10-12',
      suppliers: [
        {
          supplierPartyId: 'sup1',
          supplierName: 'Bharat Coal Traders',
          outstanding: '400000.00',
          buckets: { current: '0.00', d1_30: '0.00', d31_60: '0.00', d61_90: '0.00', d90_plus: '400000.00' },
          bills: [
            {
              billId: 'b1',
              supplierInvoiceNo: 'INV-1001',
              billDate: '2026-10-05',
              dueDate: '2026-06-01',
              outstanding: '400000.00',
              daysOverdue: 133,
              bucket: 'd90_plus',
            },
          ],
        },
      ],
      totals: {
        current: '0.00',
        d1_30: '0.00',
        d31_60: '0.00',
        d61_90: '0.00',
        d90_plus: '400000.00',
        outstanding: '400000.00',
      },
    };

    renderPage(<PayablesPage />);

    expect(await screen.findByText('Over 90 days')).toBeInTheDocument();
    // The oldest bucket is the one that should catch the eye.
    const overdue = screen.getAllByText('₹4,00,000.00');
    expect(overdue.some((el) => el.className.includes('text-danger'))).toBe(true);
  });

  it('refuses the screen to someone without purchase access', async () => {
    granted = ['company.view'];
    renderPage(<PayablesPage />);
    expect(await screen.findByText(/do not have access to payables/)).toBeInTheDocument();
  });
});
