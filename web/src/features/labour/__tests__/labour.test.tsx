import { AttendanceStatus, SettlementStatus, WageActivity } from '@brics/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ExposurePage from '@/app/(dashboard)/labour/exposure/page';
import AttendancePage from '@/app/(dashboard)/labour/attendance/page';
import AdvancesPage from '@/app/(dashboard)/labour/advances/page';
import SettlementsPage from '@/app/(dashboard)/labour/settlements/page';
import type { AdvanceExposureResult, LabourAdvance, LabourAttendance, LabourSettlement } from '../api';
import { AdvanceDialog } from '../components/advance-dialog';

const mockSites = [{ id: 'site-1', name: 'Main Kiln' }];

const mockPartiesData = {
  items: [
    { id: 'sardar-1', name: 'Ramesh Sardar' },
    { id: 'sardar-2', name: 'Suresh Sardar' },
  ],
};

const mockLedgersData = [
  { id: 'led-1', name: 'Cash in Hand', isActive: true },
  { id: 'led-2', name: 'State Bank Current', isActive: true },
];

const mockExposureSummary: AdvanceExposureResult[] = [
  {
    sardarPartyId: 'sardar-1',
    sardarName: 'Ramesh Sardar',
    advancesDrawn: '50000.00',
    wagesEarned: '32500.00',
    deductionsTotal: '5000.00',
    netExposure: '12500.00',
    isExposed: true,
    warning: 'Warning: Sardar Ramesh Sardar has unsecured advance exposure of ₹12500.00',
  },
  {
    sardarPartyId: 'sardar-2',
    sardarName: 'Suresh Sardar',
    advancesDrawn: '20000.00',
    wagesEarned: '25000.00',
    deductionsTotal: '2000.00',
    netExposure: '-7000.00',
    isExposed: false,
    warning: null,
  },
];

const mockAdvances: LabourAdvance[] = [
  {
    id: 'adv-1',
    companyId: 'comp-1',
    siteId: 'site-1',
    sardarPartyId: 'sardar-1',
    workerId: null,
    date: '2026-10-10',
    amount: '15000.00',
    paymentMode: 'cash',
    cashBankLedgerId: 'led-1',
    voucherId: 'v-101',
    remarks: 'Pre-season gang advance',
    createdAt: '2026-10-10T10:00:00Z',
    updatedAt: '2026-10-10T10:00:00Z',
    sardarParty: {
      id: 'sardar-1',
      name: 'Ramesh Sardar',
      phone: '9876543210',
    },
  },
];

const mockAttendance: LabourAttendance[] = [
  {
    id: 'att-1',
    companyId: 'comp-1',
    siteId: 'site-1',
    labourGroupId: 'grp-1',
    workerId: 'w-1',
    date: '2026-10-10',
    status: AttendanceStatus.PRESENT,
    overtimeHours: '2.0',
    remarks: 'Extra loading shift',
    createdAt: '2026-10-10T10:00:00Z',
    updatedAt: '2026-10-10T10:00:00Z',
    worker: {
      id: 'w-1',
      name: 'Sonu Kumar',
      dailyWageRate: '350.00',
    },
    labourGroup: {
      id: 'grp-1',
      name: 'Moulding Gang A',
      activity: WageActivity.MAKING,
    },
  },
];

const mockSettlements: LabourSettlement[] = [
  {
    id: 'set-1',
    companyId: 'comp-1',
    siteId: 'site-1',
    fyId: 'fy-1',
    sardarPartyId: 'sardar-1',
    periodFrom: '2026-04-01',
    periodTo: '2026-10-01',
    grossWages: '65000.00',
    advancesRecovered: '40000.00',
    deductions: '5000.00',
    netPayable: '20000.00',
    status: SettlementStatus.PAID,
    voucherId: 'v-201',
    remarks: 'Season final settlement',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
    sardarParty: {
      id: 'sardar-1',
      name: 'Ramesh Sardar',
      phone: '9876543210',
    },
  },
];

const mockGroups = [{ id: 'grp-1', name: 'Moulding Gang A', activity: 'making' }];
const mockWorkers = [{ id: 'w-1', name: 'Sonu Kumar', dailyWageRate: '350.00' }];

vi.mock('@/features/auth/use-auth', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/use-auth')>('@/features/auth/use-auth');
  return {
    ...actual,
    useSession: () => ({
      can: () => true,
      sites: mockSites,
      activeSiteId: 'site-1',
    }),
    messageOf: (e: unknown, fallback = '') => (e instanceof Error ? e.message : fallback),
    fieldErrorsOf: () => ({}),
  };
});

vi.mock('@/features/masters/hooks', () => ({
  useParties: () => ({
    data: mockPartiesData,
  }),
}));

vi.mock('@/features/accounting/hooks', () => ({
  useLedgers: () => ({
    data: mockLedgersData,
  }),
}));

vi.mock('@/features/labour/hooks', () => ({
  useExposureSummary: () => ({
    data: mockExposureSummary,
    isLoading: false,
    isError: false,
  }),
  useAdvances: () => ({
    data: mockAdvances,
    isLoading: false,
    isError: false,
  }),
  useAttendance: () => ({
    data: mockAttendance,
    isLoading: false,
    isError: false,
  }),
  useSettlements: () => ({
    data: mockSettlements,
    isLoading: false,
    isError: false,
  }),
  useSettlement: () => ({
    data: mockSettlements[0],
    isLoading: false,
  }),
  useLabourGroups: () => ({
    data: mockGroups,
    isLoading: false,
    isError: false,
  }),
  useWorkers: () => ({
    data: mockWorkers,
    isLoading: false,
    isError: false,
  }),
  useSardarExposure: (id: string | null) => ({
    data: id === 'sardar-1' ? mockExposureSummary[0] : mockExposureSummary[1],
    isLoading: false,
  }),
  useCreateAdvance: () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
  }),
  useRecordAttendance: () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
  }),
  useAccrueWages: () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
  }),
  useCreateSettlement: () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
  }),
  useCreateDeduction: () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
  }),
  useCreateLabourGroup: () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
  }),
  useUpdateLabourGroup: () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
  }),
  useCreateWorker: () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
  }),
  useUpdateWorker: () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
  }),
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('Labour Module Web Screens (P6.2)', () => {
  it('renders LEK-03 Advance Exposure monitor dashboard', () => {
    renderWithClient(<ExposurePage />);

    expect(screen.getByText(/LEK-03: Live Sardar Advance Exposure Monitor/i)).toBeInTheDocument();
    expect(screen.getAllByText('Ramesh Sardar').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Suresh Sardar').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Exposed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Safe').length).toBeGreaterThan(0);
    expect(screen.getByText('1 Sardar(s) currently exposed')).toBeInTheDocument();
  });

  it('renders advances list with totals and sardar details', () => {
    renderWithClient(<AdvancesPage />);

    expect(screen.getAllByText('Ramesh Sardar').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pre-season gang advance').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /give advance/i })).toBeInTheDocument();
  });

  it('renders live LEK-03 warning inside AdvanceDialog when exposed Sardar is selected', () => {
    renderWithClient(<AdvanceDialog open={true} defaultSardarId="sardar-1" onClose={vi.fn()} />);

    expect(screen.getByText(/LEK-03 Sardar Live Exposure/i)).toBeInTheDocument();
    expect(screen.getByText(/Warning: Sardar Ramesh Sardar has unsecured advance exposure/i)).toBeInTheDocument();
  });

  it('renders attendance register table with status badge and overtime', () => {
    renderWithClient(<AttendancePage />);

    expect(screen.getAllByText('Sonu Kumar').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Moulding Gang A').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Present').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2.0 hrs').length).toBeGreaterThan(0);
  });

  it('renders seasonal settlements register with gross and net payout amounts', () => {
    renderWithClient(<SettlementsPage />);

    expect(screen.getAllByText('Ramesh Sardar').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Paid').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /accrue wages/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new settlement/i })).toBeInTheDocument();
  });
});
