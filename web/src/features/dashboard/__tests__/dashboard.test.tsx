import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DashboardPage from '@/app/(dashboard)/dashboard/page';
import CostPerThousandPage from '@/app/(dashboard)/reports/cost-per-1000/page';
import DailyReportPage from '@/app/(dashboard)/reports/daily/page';
import SalesRegisterPage from '@/app/(dashboard)/reports/sales-register/page';
import LabourRegisterPage from '@/app/(dashboard)/reports/labour-register/page';
import type { CostRow, DashboardSummary, MonthlyPoint, SalesRegisterRow } from '../api';

let granted: string[] = [];
let summary: DashboardSummary;
let monthly: MonthlyPoint[] = [];
let costRows: CostRow[] = [];
let salesRows: SalesRegisterRow[] = [];

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

vi.mock('../api', () => ({
  fetchDashboardSummary: () => Promise.resolve({ items: [], meta: summary }),
  fetchDashboardMonthly: () =>
    Promise.resolve({
      items: monthly,
      meta: { fromMonth: '2026-01', toMonth: '2026-12', monthCount: monthly.length, siteId: null },
    }),
  fetchCostPerThousand: () =>
    Promise.resolve({
      items: costRows,
      meta: {
        fromDate: '2026-10-01',
        toDate: '2026-10-31',
        siteId: null,
        brickTypeId: null,
        rowCount: costRows.length,
        benchmark: '4100.00',
      },
    }),
  fetchDailyReport: () =>
    Promise.resolve({
      items: [],
      meta: {
        date: '2026-10-10',
        siteId: null,
        production: { fired: '9800.000', sorted: '9500.000' },
        dispatch: { bricks: '0.000', challans: 0 },
        sales: { invoiced: '35840.00', invoices: 1 },
        collection: '0.00',
        expenses: '20500.00',
        coalCost: '15000.00',
        dieselCost: '0.00',
        labourPresent: 12,
      },
    }),
  fetchSalesRegister: () =>
    Promise.resolve({
      items: salesRows,
      meta: {
        fromDate: '2026-10-01',
        toDate: '2026-10-31',
        rowCount: salesRows.length,
        taxableAmount: '32000.00',
        cgstAmount: '1920.00',
        sgstAmount: '1920.00',
        igstAmount: '0.00',
        total: '35840.00',
      },
    }),
  fetchAttendanceRegister: () =>
    Promise.resolve({
      items: [
        {
          id: 'a1',
          date: '2026-10-10',
          groupId: 'g1',
          groupName: 'Gang A',
          workerId: 'w1',
          workerName: 'Ramu',
          status: 'present',
          overtimeHours: '0.00',
        },
        {
          id: 'a2',
          date: '2026-10-10',
          groupId: 'g1',
          groupName: 'Gang A',
          workerId: 'w2',
          workerName: 'Shyam',
          status: 'absent',
          overtimeHours: '0.00',
        },
      ],
      meta: {
        kind: 'attendance',
        fromDate: '2026-10-01',
        toDate: '2026-10-31',
        rowCount: 2,
        presentDays: 1,
        halfDays: 0,
        absentDays: 1,
      },
    }),
  fetchWageRegister: () =>
    Promise.resolve({
      items: [
        {
          accrualId: 'w1',
          periodFrom: '2026-10-01',
          periodTo: '2026-10-07',
          sardarId: 's1',
          sardarName: 'Ramesh',
          grossWages: '5000.00',
        },
      ],
      meta: { kind: 'wages', fromDate: '2026-10-01', toDate: '2026-10-31', rowCount: 1, totalGrossWages: '5000.00' },
    }),
}));

function renderPage(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const baseSummary: DashboardSummary = {
  asOf: '2026-10-13',
  window: { firstOfMonth: '2026-10-01', lastOfMonth: '2026-10-31', firstOfYear: '2026-04-01' },
  siteId: null,
  production: {
    firedToday: '0.000',
    firedMtd: '9800.000',
    firedYtd: '9800.000',
    sortedToday: '0.000',
    sortedMtd: '9500.000',
    sortedYtd: '9500.000',
  },
  stock: { bricksProduced: '9500.000', itemsOnHand: '50000.000', itemCount: 2 },
  sold: { mtd: '35840.00', ytd: '35840.00', collectionMtd: '0.00', collectionYtd: '0.00' },
  dispatched: { mtd: '3000.000', ytd: '3000.000' },
  receivables: '35840.00',
  payables: '0.00',
  labourPayable: '5000.00',
  expenses: { mtd: '20500.00', ytd: '20500.00' },
  coalCostMtd: '15000.00',
  dieselCostMtd: '0.00',
  estimatedProfitMtd: '12000.00',
  costPerThousandMtd: '4132.65',
  costPerThousandBenchmark: '4100.00',
  grossMarginPercentMtd: '21.50',
};

describe('Dashboard & reports screens (P11.2)', () => {
  it('shows the KMQs on the owner dashboard', async () => {
    granted = ['accounts.view'];
    summary = baseSummary;
    monthly = [
      {
        month: '2026-10',
        productionFired: '9800.000',
        salesInvoiced: '35840.00',
        collection: '0.00',
        dispatched: '3000.000',
        expenses: '20500.00',
        coalCost: '15000.00',
        dieselCost: '0.00',
      },
    ];
    renderPage(<DashboardPage />);
    // Receivables, labour payable, expenses tiles.
    expect(await screen.findByText(/Receivables/i)).toBeInTheDocument();
    expect(screen.getByText(/Labour payable/i)).toBeInTheDocument();
    // Cost per 1,000 reading plus the over-benchmark badge.
    expect(screen.getByTestId('cost-over-benchmark')).toBeInTheDocument();
  });

  it('reports "not yet" rather than a zero when nothing fired this month', async () => {
    granted = ['accounts.view'];
    summary = { ...baseSummary, costPerThousandMtd: null, grossMarginPercentMtd: null };
    renderPage(<DashboardPage />);
    expect(await screen.findByText(/Not yet/i)).toBeInTheDocument();
    expect(screen.queryByTestId('cost-over-benchmark')).not.toBeInTheDocument();
  });

  it('CST-01 flags a row over the ₹4,100 benchmark in the danger colour', async () => {
    granted = ['accounts.view'];
    costRows = [
      {
        siteId: 's1',
        month: '2026-10',
        brickTypeId: 'bt1',
        brickTypeGrade: 'Class 1',
        firedBricks: '9500.000',
        shareOfKilnMonth: '1.0000',
        buckets: {
          labour: '5000.00',
          coal: '15000.00',
          soil: '0.00',
          electricity: '20500.00',
          loading: '0.00',
          repairs: '0.00',
          other: '0.00',
        },
        totalCost: '40500.00',
        costPerThousand: '4263.16',
        benchmark: '4100.00',
        deltaVsBenchmark: '163.16',
        overBenchmark: true,
      },
    ];
    renderPage(<CostPerThousandPage />);
    expect((await screen.findAllByText(/Class 1/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('cost-row-over').length).toBeGreaterThan(0);
  });

  it('daily report rolls up a day across every module', async () => {
    granted = ['accounts.view'];
    renderPage(<DailyReportPage />);
    expect(await screen.findByText(/Sales invoiced/i)).toBeInTheDocument();
    expect(screen.getByText(/Fired bricks/i)).toBeInTheDocument();
    expect(screen.getByText(/Labour present/i)).toBeInTheDocument();
  });

  it('sales register lists one row per invoice line and offers a CSV export button', async () => {
    granted = ['accounts.view'];
    salesRows = [
      {
        invoiceId: 'i1',
        invoiceNo: 'INV-00001',
        invoiceDate: '2026-10-10',
        customerId: 'c1',
        customerName: 'Shri Krishna Builders',
        itemId: 'b1',
        itemName: 'Class 1 Brick',
        hsnCode: null,
        quantity: '4000.000',
        rate: '8.00',
        discount: '0.00',
        taxableAmount: '32000.00',
        cgstAmount: '1920.00',
        sgstAmount: '1920.00',
        igstAmount: '0.00',
        lineTotal: '35840.00',
      },
    ];
    renderPage(<SalesRegisterPage />);
    expect((await screen.findAllByText('INV-00001')).length).toBeGreaterThan(0);
    // HSN missing is called out in the danger colour (ADR-048 pattern).
    expect(screen.getAllByText(/missing/i).length).toBeGreaterThan(0);
    // Project convention: desktop + mobile share the DOM, so .length > 0.
    expect(screen.getAllByRole('button', { name: /export sales register as csv/i }).length).toBeGreaterThan(0);
  });

  it('labour register switches between attendance and wages tabs', async () => {
    granted = ['accounts.view'];
    renderPage(<LabourRegisterPage />);
    // Attendance renders first.
    expect((await screen.findAllByText('Ramu')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Present/i).length).toBeGreaterThan(0);
    // Status badges are the field convention — a red "absent" is visible.
    expect(screen.getAllByText(/absent/i).length).toBeGreaterThan(0);
  });

  it('refuses access without accounts.view', async () => {
    granted = [];
    renderPage(<DailyReportPage />);
    expect(await screen.findByText(/do not have access/i)).toBeInTheDocument();
  });
});
