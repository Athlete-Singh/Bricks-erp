import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChallansPage from '@/app/(dashboard)/dispatch/challans/page';
import GateReportPage from '@/app/(dashboard)/dispatch/gate/page';
import VehiclePnlPage from '@/app/(dashboard)/dispatch/vehicle-pnl/page';
import type { Dispatch, GateMeta, GateRow, VehicleProfitMeta, VehicleProfitRow } from '../api';

let granted: string[] = [];
let challans: Dispatch[] = [];
let gate: { items: GateRow[]; meta: GateMeta };
let pnl: { items: VehicleProfitRow[]; meta: VehicleProfitMeta };

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
  useParties: () => ({ data: { items: [{ id: 'c1', name: 'Shri Krishna Builders' }] } }),
  useItems: () => ({ data: { items: [{ id: 'i1', name: 'Class 1 Brick' }] } }),
  useWarehouses: () => ({ data: { items: [{ id: 'w1', name: 'Finished Yard' }] } }),
  useVehicles: () => ({ data: { items: [{ id: 'v1', registrationNo: 'UP32 AB 1234' }] } }),
  useDrivers: () => ({ data: { items: [{ id: 'd1', name: 'Ramesh' }] } }),
}));

vi.mock('@/features/accounting/hooks', () => ({
  useLedgers: () => ({ data: [{ id: 'cash', name: 'Cash', code: 'CASH' }] }),
}));

vi.mock('../api', () => ({
  fetchDispatches: () => Promise.resolve({ items: challans, meta: { page: 1, limit: 25, total: challans.length } }),
  fetchGateReconciliation: () => Promise.resolve(gate),
  fetchVehicleProfitability: () => Promise.resolve(pnl),
  fetchTrips: () => Promise.resolve({ items: [], meta: { page: 1, limit: 25, total: 0 } }),
  fetchVehicleExpenses: () => Promise.resolve({ items: [], meta: { page: 1, limit: 25, total: 0 } }),
  fetchDispatch: vi.fn(),
  fetchChallanPdfObjectUrl: vi.fn(),
  createDispatch: vi.fn(),
  confirmDispatch: vi.fn(),
  acknowledgeDelivery: vi.fn(),
  cancelDispatch: vi.fn(),
  createTrip: vi.fn(),
  createVehicleExpense: vi.fn(),
}));

function challan(overrides: Partial<Dispatch> = {}): Dispatch {
  return {
    id: 'ch1',
    challanNo: 'CHL-00001',
    siteId: 's1',
    customerPartyId: 'c1',
    salesInvoiceId: null,
    salesOrderId: null,
    vehicleId: 'v1',
    driverId: 'd1',
    loadingGroupId: null,
    dispatchDate: '2026-10-02',
    loadingLocation: null,
    deliveryLocation: 'Ring Road',
    status: 'draft',
    movedStock: false,
    confirmedAt: null,
    deliveredOn: null,
    receivedBy: null,
    deliveryRemarks: null,
    cancelReason: null,
    notes: null,
    ...overrides,
  };
}

function gateRow(overrides: Partial<GateRow> = {}): GateRow {
  return {
    dispatchId: 'ch1',
    challanNo: 'CHL-00001',
    dispatchDate: '2026-10-02',
    status: 'confirmed',
    customerName: 'Shri Krishna Builders',
    vehicleNo: 'UP32 AB 1234',
    invoiceNo: null,
    dispatchedQuantity: '1200.000',
    invoicedQuantity: null,
    stockMovedBy: 'dispatch',
    stockQuantity: '1200.000',
    unbilled: true,
    quantityMismatch: false,
    ...overrides,
  };
}

function renderPage(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('Dispatch screens (P9.2)', () => {
  it('says which document emptied the yard, so a reader never has to guess (ADR-041)', async () => {
    granted = ['dispatch.view', 'dispatch.manage'];
    challans = [
      challan({ id: 'a', challanNo: 'CHL-00001', status: 'confirmed', movedStock: true }),
      challan({ id: 'b', challanNo: 'CHL-00002', status: 'confirmed', movedStock: false, salesInvoiceId: 'inv1' }),
    ];

    renderPage(<ChallansPage />);

    expect((await screen.findAllByText('CHL-00001')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('stock out here').length).toBeGreaterThan(0);
    expect(screen.getAllByText('stock out on invoice').length).toBeGreaterThan(0);
  });

  it('offers Confirm out only on a draft, and only to someone who may open the gate', async () => {
    granted = ['dispatch.view', 'dispatch.manage'];
    challans = [challan({ status: 'draft' })];
    const withManage = renderPage(<ChallansPage />);
    expect((await screen.findAllByRole('button', { name: /confirm out/i })).length).toBeGreaterThan(0);
    withManage.unmount();

    // A viewer may read the register but must not be offered the gate.
    granted = ['dispatch.view'];
    renderPage(<ChallansPage />);
    expect((await screen.findAllByText('CHL-00001')).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /confirm out/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /new challan/i })).not.toBeInTheDocument();
  });

  it('offers Record delivery only to someone holding dispatch.acknowledge', async () => {
    // Opening the gate and signing for the load are different acts.
    granted = ['dispatch.view', 'dispatch.manage'];
    challans = [challan({ status: 'confirmed', movedStock: true })];
    const withoutAck = renderPage(<ChallansPage />);
    expect((await screen.findAllByText('CHL-00001')).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /record delivery/i })).not.toBeInTheDocument();
    withoutAck.unmount();

    granted = ['dispatch.view', 'dispatch.manage', 'dispatch.acknowledge'];
    renderPage(<ChallansPage />);
    expect((await screen.findAllByRole('button', { name: /record delivery/i })).length).toBeGreaterThan(0);
  });

  it('LEK-04 — names the trucks that left without a bill', async () => {
    granted = ['dispatch.view'];
    gate = {
      items: [gateRow(), gateRow({ dispatchId: 'ch2', challanNo: 'CHL-00002', invoiceNo: 'SAL/2026-27/000004', unbilled: false, invoicedQuantity: '900.000', dispatchedQuantity: '900.000' })],
      meta: {
        fromDate: '2026-10-01',
        toDate: '2026-10-31',
        dispatchCount: 2,
        dispatchedQuantity: '2100.000',
        invoicedQuantity: '900.000',
        unbilledCount: 1,
        unbilledQuantity: '1200.000',
        mismatchCount: 0,
      },
    };

    renderPage(<GateReportPage />);

    expect((await screen.findAllByText('No bill')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('SAL/2026-27/000004').length).toBeGreaterThan(0);
    // The warning has to name the loss in bricks, not just a count.
    expect(screen.getByText(/One truck left the gate/i)).toBeInTheDocument();
    expect(screen.getByText(/1200\.000 bricks gone/i)).toBeInTheDocument();
  });

  it('LEK-04 — flags a part-billed challan rather than calling it settled', async () => {
    granted = ['dispatch.view'];
    gate = {
      items: [gateRow({ invoiceNo: 'SAL/2026-27/000005', unbilled: false, invoicedQuantity: '700.000', quantityMismatch: true })],
      meta: {
        fromDate: '2026-10-01',
        toDate: '2026-10-31',
        dispatchCount: 1,
        dispatchedQuantity: '1200.000',
        invoicedQuantity: '700.000',
        unbilledCount: 0,
        unbilledQuantity: '0.000',
        mismatchCount: 1,
      },
    };

    renderPage(<GateReportPage />);
    expect((await screen.findAllByText(/Part billed/)).length).toBeGreaterThan(0);
  });

  it('VEH-07 — shows a loss-making vehicle and says invoice freight is not counted', async () => {
    granted = ['transport.view'];
    pnl = {
      items: [
        {
          vehicleId: 'v1',
          registrationNo: 'UP32 AB 1234',
          ownerType: 'own',
          tripCount: 2,
          distanceKm: '120.000',
          freightIncome: '7000.00',
          diesel: '7000.00',
          maintenance: '1800.00',
          loading: '600.00',
          hire: '0.00',
          totalCost: '9400.00',
          net: '-2400.00',
          litresPer100Km: '33.33',
          costPerKm: '78.33',
        },
      ],
      meta: {
        fromDate: '2026-10-01',
        toDate: '2026-10-31',
        vehicleCount: 1,
        freightIncome: '7000.00',
        totalCost: '9400.00',
        net: '-2400.00',
      },
    };

    renderPage(<VehiclePnlPage />);

    expect((await screen.findAllByText('UP32 AB 1234')).length).toBeGreaterThan(0);
    expect(screen.getByText(/Freight billed on a sales invoice is not counted/i)).toBeInTheDocument();
  });

  it('refuses the whole section to someone without dispatch.view', async () => {
    granted = [];
    challans = [challan()];
    renderPage(<ChallansPage />);
    expect(await screen.findByText(/do not have access to dispatch/i)).toBeInTheDocument();
    expect(screen.queryByText('CHL-00001')).not.toBeInTheDocument();
  });
});
