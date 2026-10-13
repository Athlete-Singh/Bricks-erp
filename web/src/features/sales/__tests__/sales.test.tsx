import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import InvoicesPage from '@/app/(dashboard)/sales/invoices/page';
import NotesPage from '@/app/(dashboard)/sales/notes/page';
import ReceivablesPage from '@/app/(dashboard)/sales/receivables/page';
import type { CreditNote, ReceivablesAgeing, SalesInvoice } from '../api';

let granted: string[] = [];
let invoices: SalesInvoice[] = [];
let creditNotes: CreditNote[] = [];
let ageing: ReceivablesAgeing;

vi.mock('@/features/auth/use-auth', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/use-auth')>('@/features/auth/use-auth');
  return {
    ...actual,
    useSession: () => ({
      can: (...codes: string[]) => codes.every((c) => granted.includes(c)),
      sites: [{ id: 's1', name: 'Kiln One' }],
      company: { id: 'co1', name: 'My Brick Kiln', stateCode: '09' },
    }),
  };
});

vi.mock('@/features/masters/hooks', () => ({
  useParties: () => ({
    data: {
      items: [
        { id: 'c1', name: 'Shri Krishna Builders', stateCode: '09' },
        { id: 'c2', name: 'Delhi Builders', stateCode: '07' },
      ],
    },
  }),
  useItems: () => ({ data: { items: [{ id: 'i1', name: 'Class 1 Brick' }] } }),
  useWarehouses: () => ({ data: { items: [{ id: 'w1', name: 'Finished Yard' }] } }),
}));

vi.mock('@/features/accounting/hooks', () => ({
  useLedgers: () => ({ data: [{ id: 'cash', name: 'Cash', code: 'CASH' }] }),
}));

vi.mock('../api', () => ({
  fetchInvoices: () => Promise.resolve({ items: invoices, meta: { page: 1, limit: 25, total: invoices.length } }),
  fetchCreditNotes: () =>
    Promise.resolve({ items: creditNotes, meta: { page: 1, limit: 25, total: creditNotes.length } }),
  fetchDebitNotes: () => Promise.resolve({ items: [], meta: { page: 1, limit: 25, total: 0 } }),
  fetchReceivablesAgeing: () => Promise.resolve(ageing),
  fetchQuotations: () => Promise.resolve({ items: [], meta: { page: 1, limit: 25, total: 0 } }),
  fetchSalesOrders: () => Promise.resolve({ items: [], meta: { page: 1, limit: 25, total: 0 } }),
  fetchReceipts: () => Promise.resolve({ items: [], meta: { page: 1, limit: 25, total: 0 } }),
  fetchInvoice: vi.fn(),
  fetchQuotation: vi.fn(),
  fetchSalesOrder: vi.fn(),
  fetchInvoicePdfObjectUrl: vi.fn(),
  createInvoice: vi.fn(),
  createQuotation: vi.fn(),
  createSalesOrder: vi.fn(),
  createReceipt: vi.fn(),
  createCreditNote: vi.fn(),
  createDebitNote: vi.fn(),
  changeQuotationStatus: vi.fn(),
  cancelSalesOrder: vi.fn(),
}));

function invoice(overrides: Partial<SalesInvoice> = {}): SalesInvoice {
  return {
    id: 'inv1',
    invoiceNo: 'SAL/2026-27/000001',
    customerPartyId: 'c1',
    siteId: 's1',
    salesOrderId: null,
    invoiceDate: '2026-09-10',
    dueDate: '2026-10-10',
    customerPoNo: null,
    taxableAmount: '32000.00',
    cgstAmount: '1920.00',
    sgstAmount: '1920.00',
    igstAmount: '0.00',
    totalAmount: '35840.00',
    paidAmount: '0.00',
    status: 'open',
    voucherId: 'v1',
    notes: null,
    ...overrides,
  } as SalesInvoice;
}

function renderPage(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('Sales screens (P8.2)', () => {
  it('shows an invoice with its tax split and what is still unpaid', async () => {
    granted = ['sales.view', 'sales.manage'];
    invoices = [invoice()];

    renderPage(<InvoicesPage />);

    expect((await screen.findAllByText('SAL/2026-27/000001')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('₹35,840.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('open').length).toBeGreaterThan(0);
  });

  it('offers the PDF on every invoice, named so a screen reader can tell them apart', async () => {
    granted = ['sales.view'];
    invoices = [invoice(), invoice({ id: 'inv2', invoiceNo: 'SAL/2026-27/000002' })];

    renderPage(<InvoicesPage />);

    // DataTable mounts a desktop table AND a mobile card list at the same time
    // and hides one with CSS, so every row's button appears twice in the
    // accessible tree. `getAllByRole + .length > 0` is the project convention
    // for anything inside a row (see purchases.test.tsx) — this exercises the
    // accessible-name path a screen reader actually walks.
    await screen.findAllByText('SAL/2026-27/000001');
    expect(screen.getAllByRole('button', { name: /Open PDF for SAL\/2026-27\/000001/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Open PDF for SAL\/2026-27\/000002/ }).length).toBeGreaterThan(0);
  });

  it('hides invoice creation from someone who may only read sales', async () => {
    // Issuing an invoice moves stock and posts a journal — reading does neither.
    granted = ['sales.view'];
    invoices = [invoice()];
    const viewer = renderPage(<InvoicesPage />);
    expect((await screen.findAllByText('SAL/2026-27/000001')).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /new invoice/i })).not.toBeInTheDocument();
    viewer.unmount();

    granted = ['sales.view', 'sales.manage'];
    renderPage(<InvoicesPage />);
    expect(await screen.findByRole('button', { name: /new invoice/i })).toBeInTheDocument();
  });

  it('GST-02 — offers IGST for an out-of-state customer and CGST/SGST for a local one', async () => {
    // Which tax applies is not the user's choice; it follows from where the
    // goods are going. Offering all three invites the one mistake that costs
    // the kiln interest at filing time.
    const user = userEvent.setup();
    granted = ['sales.view', 'sales.manage'];
    invoices = [invoice()];

    renderPage(<InvoicesPage />);
    await user.click(await screen.findByRole('button', { name: /new invoice/i }));

    // "Customer" also names a column header in the list behind the dialog, so
    // the selector is matched exactly.
    const picker = screen.getByLabelText('Customer *');
    await user.selectOptions(picker, 'c2');
    expect(screen.getByText(/inter-state, so the lines carry IGST/i)).toBeInTheDocument();
    expect(screen.getByLabelText('IGST %')).toBeInTheDocument();
    expect(screen.queryByLabelText('CGST %')).not.toBeInTheDocument();

    await user.selectOptions(picker, 'c1');
    expect(screen.getByText(/intra-state, so the lines carry CGST \+ SGST/i)).toBeInTheDocument();
    expect(screen.getByLabelText('CGST %')).toBeInTheDocument();
    expect(screen.queryByLabelText('IGST %')).not.toBeInTheDocument();
  });

  it('refuses the whole section to someone without sales.view', async () => {
    granted = [];
    ageing = {
      asOf: '2026-09-30',
      customers: [],
      totals: {
        current: '0.00',
        d1_30: '0.00',
        d31_60: '0.00',
        d61_90: '0.00',
        d90_plus: '0.00',
        outstanding: '0.00',
      },
    };

    renderPage(<ReceivablesPage />);
    expect(await screen.findByText(/do not have access/i)).toBeInTheDocument();
  });

  it('tells a value-only credit note apart from one that put bricks back (ADR-040)', async () => {
    granted = ['sales.view', 'sales.manage'];
    creditNotes = [
      {
        id: 'cn1',
        noteNo: 'CRN-00001',
        customerPartyId: 'c1',
        siteId: 's1',
        invoiceId: 'inv1',
        noteDate: '2026-09-12',
        reason: 'Two pallets came back',
        taxableAmount: '2000.00',
        taxAmount: '240.00',
        totalAmount: '2240.00',
        restocked: true,
        voucherId: 'v2',
      } as unknown as CreditNote,
      {
        id: 'cn2',
        noteNo: 'CRN-00002',
        customerPartyId: 'c1',
        siteId: 's1',
        invoiceId: 'inv1',
        noteDate: '2026-09-13',
        reason: 'Rate agreed lower after delivery',
        taxableAmount: '500.00',
        taxAmount: '60.00',
        totalAmount: '560.00',
        restocked: false,
        voucherId: 'v3',
      } as unknown as CreditNote,
    ];

    renderPage(<NotesPage />);

    // Whether goods came back is not inferable from the amount, so the row says it.
    expect((await screen.findAllByText('Re-stocked')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Value only').length).toBeGreaterThan(0);
  });

  it('puts the over-90 bucket in the danger colour only when something is in it', async () => {
    granted = ['sales.view'];
    ageing = {
      asOf: '2026-09-30',
      customers: [
        {
          customerPartyId: 'c1',
          customerName: 'Shri Krishna Builders',
          outstanding: '40000.00',
          buckets: {
            current: '0.00',
            d1_30: '0.00',
            d31_60: '0.00',
            d61_90: '0.00',
            d90_plus: '40000.00',
          },
          invoices: [],
        },
      ],
      totals: {
        current: '0.00',
        d1_30: '0.00',
        d31_60: '0.00',
        d61_90: '0.00',
        d90_plus: '40000.00',
        outstanding: '40000.00',
      },
    };

    const { container } = renderPage(<ReceivablesPage />);

    // The label shows up both as the summary-tile heading and the per-customer
    // badge, so match them all rather than demanding uniqueness.
    expect((await screen.findAllByText(/Over 90/i)).length).toBeGreaterThan(0);
    // Money that old is the thing an owner has to act on, so it is not styled
    // like every other column.
    expect(container.querySelectorAll('.text-danger').length).toBeGreaterThan(0);
  });

  it('does not colour the over-90 bucket when it is empty', async () => {
    granted = ['sales.view'];
    ageing = {
      asOf: '2026-09-30',
      customers: [],
      totals: {
        current: '12000.00',
        d1_30: '0.00',
        d31_60: '0.00',
        d61_90: '0.00',
        d90_plus: '0.00',
        outstanding: '12000.00',
      },
    };

    const { container } = renderPage(<ReceivablesPage />);

    expect((await screen.findAllByText(/Over 90/i)).length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.text-danger')).toHaveLength(0);
  });
});
