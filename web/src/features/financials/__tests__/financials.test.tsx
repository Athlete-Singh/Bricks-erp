import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ExpensesPage from '@/app/(dashboard)/reports/expenses/page';
import StatementsPage from '@/app/(dashboard)/reports/statements/page';
import GstPage from '@/app/(dashboard)/reports/gst/page';
import type { BalanceSheet, Expense, GstReconLine, GstReconMeta, ProfitAndLoss } from '../api';

let granted: string[] = [];
let expenses: Expense[] = [];
let pnl: ProfitAndLoss;
let balanceSheet: BalanceSheet;
let recon: { items: GstReconLine[]; meta: GstReconMeta };

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

vi.mock('@/features/accounting/hooks', () => ({
  useLedgers: () => ({ data: [{ id: 'cash', name: 'Cash', code: 'CASH' }] }),
}));

vi.mock('@/features/masters/hooks', () => ({
  useParties: () => ({ data: { items: [{ id: 'sup1', name: 'UP Power Corporation' }] } }),
}));

vi.mock('../api', () => ({
  fetchExpenseCategories: () =>
    Promise.resolve([
      { id: 'elec', name: 'Electricity & Power', code: 'ELECTRICITY', kind: 'direct' },
      { id: 'rent', name: 'Rent', code: 'RENT', kind: 'indirect' },
    ]),
  fetchExpenses: () => Promise.resolve({ items: expenses, meta: { page: 1, limit: 25, total: expenses.length } }),
  createExpense: vi.fn(),
  fetchBook: () => Promise.resolve({ items: [], meta: {} }),
  fetchClosingStock: () =>
    Promise.resolve({
      items: [{ itemId: 'i1', itemName: 'Class 1 Brick', quantity: '6000.000', rate: null, value: null, unvalued: true }],
      meta: { asOf: '2026-09-30', itemCount: 1, valuedCount: 0, unvaluedCount: 1, totalValue: '0.00' },
    }),
  setClosingStockRates: vi.fn(),
  fetchProfitAndLoss: () => Promise.resolve({ items: [], meta: pnl }),
  fetchBalanceSheet: () => Promise.resolve({ items: [], meta: balanceSheet }),
  fetchPartyBalances: () =>
    Promise.resolve({
      items: [
        { partyId: 'p1', name: 'Shri Krishna Builders', partyTypes: ['customer'], receivable: '35840.00', payable: '0.00', net: '35840.00' },
      ],
      meta: { asOf: '2026-09-30', partyCount: 1, receivable: '35840.00', payable: '0.00' },
    }),
  fetchGstr1: () =>
    Promise.resolve({
      items: [],
      meta: {
        month: '2026-09',
        b2b: [],
        b2c: [],
        hsnSummary: [
          { hsnCode: '(none)', description: 'Class 1 Brick', quantity: '1000.000', taxableAmount: '10000.00', cgstAmount: '600.00', sgstAmount: '600.00', igstAmount: '0.00' },
        ],
        creditNotes: [],
        totals: { b2bCount: 1, b2cCount: 1, taxableAmount: '60000.00', cgstAmount: '3600.00', sgstAmount: '3600.00', igstAmount: '0.00', creditNoteTax: '0.00' },
      },
    }),
  fetchGstr3b: () =>
    Promise.resolve({
      items: [],
      meta: {
        month: '2026-09',
        outwardSupplies: { taxableAmount: '60000.00', cgstAmount: '3600.00', sgstAmount: '3600.00', igstAmount: '0.00' },
        inwardSupplies: { taxableAmount: '0.00', cgstAmount: '0.00', sgstAmount: '0.00', igstAmount: '0.00' },
        totals: { outputTax: '7200.00', inputCredit: '0.00', netPayable: '7200.00' },
      },
    }),
  fetchGstReconciliation: () => Promise.resolve(recon),
  fetchGstr1CsvObjectUrl: vi.fn(),
}));

function renderPage(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const emptyPnl = (overrides: Partial<ProfitAndLoss> = {}): ProfitAndLoss => ({
  fromDate: '2026-09-01',
  toDate: '2026-09-30',
  directIncome: [{ ledgerId: 'l1', ledgerName: 'Sales — Bricks', ledgerCode: 'SALES_BRICKS', groupName: 'Sales', amount: '32000.00' }],
  directExpenses: [{ ledgerId: 'l2', ledgerName: 'Electricity & Power', ledgerCode: 'ELECTRICITY', groupName: 'Direct', amount: '20000.00' }],
  indirectIncome: [],
  indirectExpenses: [],
  openingStock: null,
  closingStock: { value: '66000.00', unvaluedCount: 0 },
  totals: {
    directIncome: '32000.00',
    directExpenses: '20000.00',
    indirectIncome: '0.00',
    indirectExpenses: '0.00',
    grossProfit: '78000.00',
    netProfit: '78000.00',
  },
  unvaluedStockGrades: 0,
  ...overrides,
});

describe('Accounts and GST screens (P10.2)', () => {
  it('marks an unpaid expense as owed rather than as money that left', async () => {
    granted = ['accounts.view', 'accounts.manage'];
    expenses = [
      {
        id: 'e1',
        expenseNo: 'EXP-00001',
        siteId: 's1',
        categoryLedgerId: 'elec',
        expenseDate: '2026-09-05',
        amount: '20000.00',
        mode: 'cash',
        paidFromLedgerId: 'cash',
        partyId: null,
        instrumentType: null,
        instrumentRef: null,
        voucherId: 'v1',
        description: 'September power bill',
      },
      {
        id: 'e2',
        expenseNo: 'EXP-00002',
        siteId: 's1',
        categoryLedgerId: 'rent',
        expenseDate: '2026-09-06',
        amount: '5000.00',
        mode: 'credit',
        paidFromLedgerId: null,
        partyId: 'sup1',
        instrumentType: null,
        instrumentRef: null,
        voucherId: 'v2',
        description: null,
      },
    ];

    renderPage(<ExpensesPage />);

    expect((await screen.findAllByText('EXP-00001')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('owed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('cash').length).toBeGreaterThan(0);
  });

  it('offers the entry form only to someone who may move money', async () => {
    granted = ['accounts.view'];
    expenses = [];
    renderPage(<ExpensesPage />);
    expect(await screen.findByText(/Nothing recorded in this window/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /record an expense/i })).not.toBeInTheDocument();
  });

  it('warns on the face of the statements when stock was never priced (ADR-046)', async () => {
    granted = ['accounts.view'];
    pnl = emptyPnl({ unvaluedStockGrades: 2, closingStock: { value: '0.00', unvaluedCount: 2 } });
    balanceSheet = {
      asOf: '2026-09-30',
      assets: [],
      liabilities: [],
      closingStock: { value: '0.00', unvaluedCount: 2 },
      retainedEarnings: '12000.00',
      totals: { assets: '0.00', liabilities: '0.00', difference: '0.00' },
      unvaluedStockGrades: 2,
    };

    renderPage(<StatementsPage />);

    expect(await screen.findByText(/2 grades in the yard have no/i)).toBeInTheDocument();
  });

  it('shows the Balance Sheet difference instead of hiding it', async () => {
    granted = ['accounts.view'];
    pnl = emptyPnl();
    balanceSheet = {
      asOf: '2026-09-30',
      assets: [{ groupCode: 'CASH_IN_HAND', groupName: 'Cash-in-hand', lines: [{ ledgerName: 'Cash', amount: '-20000.00' }], total: '-20000.00' }],
      liabilities: [],
      closingStock: { value: '66000.00', unvaluedCount: 0 },
      retainedEarnings: '12000.00',
      totals: { assets: '46000.00', liabilities: '12000.00', difference: '34000.00' },
      unvaluedStockGrades: 0,
    };

    renderPage(<StatementsPage />);
    expect(await screen.findByText(/Assets and liabilities differ by/i)).toBeInTheDocument();
  });

  it('GST-07 — calls a month unfilable when an invoice has no HSN, even if the numbers agree', async () => {
    granted = ['taxes.view'];
    recon = {
      items: [
        { label: 'Output CGST', perRegister: '3600.00', perBooks: '3600.00', difference: '0.00', matches: true },
        { label: 'Output SGST', perRegister: '3600.00', perBooks: '3600.00', difference: '0.00', matches: true },
      ],
      meta: {
        month: '2026-09',
        mismatchCount: 0,
        invoicesMissingHsn: 1,
        missingHsnTaxable: '10000.00',
        clean: false,
      },
    };

    renderPage(<GstPage />);

    // Balanced is not the same claim as filable.
    expect(await screen.findByText(/has no HSN — the portal rejects those rows/i)).toBeInTheDocument();
    expect(screen.queryByText(/ready to file/i)).not.toBeInTheDocument();
    expect(screen.getAllByText('no HSN').length).toBeGreaterThan(0);
  });

  it('GST-07 — says a clean month is ready to file', async () => {
    granted = ['taxes.view'];
    recon = {
      items: [{ label: 'Output CGST', perRegister: '3600.00', perBooks: '3600.00', difference: '0.00', matches: true }],
      meta: { month: '2026-09', mismatchCount: 0, invoicesMissingHsn: 0, missingHsnTaxable: '0.00', clean: true },
    };

    renderPage(<GstPage />);
    expect(await screen.findByText(/ready to file/i)).toBeInTheDocument();
  });

  it('refuses the GST screens to someone without taxes.view', async () => {
    granted = ['accounts.view'];
    renderPage(<GstPage />);
    expect(await screen.findByText(/do not have access to the GST registers/i)).toBeInTheDocument();
  });
});
