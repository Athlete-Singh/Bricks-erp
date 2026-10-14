import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TenantDetailDto } from '@brics/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminTenantDetailPage from '@/app/admin/tenants/[id]/page';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'tenant-1' }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const sessionMock = vi.fn();
vi.mock('@/features/auth/use-auth', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/use-auth')>('@/features/auth/use-auth');
  return { ...actual, useSession: () => sessionMock() };
});

const fetchTenantMock = vi.fn();
const fetchTenantSupportSessionsMock = vi.fn();
const reactivateTenantMock = vi.fn();
const updateTenantSettingsMock = vi.fn();

vi.mock('../api', () => ({
  fetchTenant: (id: string) => fetchTenantMock(id),
  fetchTenantSupportSessions: (tenantId: string) => fetchTenantSupportSessionsMock(tenantId),
  reactivateTenant: (id: string) => reactivateTenantMock(id),
  updateTenantSettings: (id: string, dto: unknown) => updateTenantSettingsMock(id, dto),
  suspendTenant: vi.fn(),
  openSupportSession: vi.fn(),
}));

const TENANT_DETAIL: TenantDetailDto = {
  id: 'tenant-1',
  name: 'Ganga Brickworks',
  stateCode: '09',
  status: 'active',
  gstin: '09AAACG1234F1Z5',
  planName: 'growth',
  trialEndsAt: null,
  lastActiveAt: '2026-10-14T10:30:00.000Z',
  requireSupportApproval: false,
  supportAccessGrantedUntil: null,
  createdAt: '2026-01-15T00:00:00.000Z',
  counts: {
    users: 2,
    kilns: 2,
    activeKilns: 1,
    vouchers: 120,
    salesInvoices: 45,
  },
  users: [
    {
      id: 'u1',
      name: 'Ramesh Kumar',
      email: 'ramesh@ganga.test',
      mobile: '9876543210',
      roleCode: 'owner',
      roleName: 'Owner',
      isActive: true,
      createdAt: '2026-01-15T00:00:00.000Z',
    },
    {
      id: 'u2',
      name: 'Suresh Accountant',
      email: null,
      mobile: '9876543211',
      roleCode: 'accountant',
      roleName: 'Accountant',
      isActive: true,
      createdAt: '2026-02-01T00:00:00.000Z',
    },
  ],
  kilns: [
    {
      id: 'k1',
      name: 'Ganga North Kiln',
      code: 'GNK-01',
      type: 'kiln',
      isActive: true,
      createdAt: '2026-01-15T00:00:00.000Z',
    },
    {
      id: 'k2',
      name: 'South Depot',
      code: 'DEP-02',
      type: 'depot',
      isActive: false,
      createdAt: '2026-02-10T00:00:00.000Z',
    },
  ],
};

function withPermissions(...codes: string[]) {
  sessionMock.mockReturnValue({
    status: 'authenticated',
    user: { permissions: codes },
    can: (...needed: string[]) => needed.every((c) => codes.includes(c)),
  });
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AdminTenantDetailPage />
    </QueryClientProvider>,
  );
}

describe('AdminTenantDetailPage (PLT-09 / S3.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchTenantMock.mockResolvedValue(TENANT_DETAIL);
    fetchTenantSupportSessionsMock.mockResolvedValue([]);
  });

  it('renders metadata, metrics cards, and default users tab', async () => {
    withPermissions('platform.tenants.view', 'platform.tenants.manage', 'platform.support.request');
    renderPage();

    await screen.findByText('Ganga Brickworks');

    // Metadata grid values
    expect(screen.getByText('09AAACG1234F1Z5')).toBeInTheDocument();
    expect(screen.getByText('growth')).toBeInTheDocument();

    // High-level metric counts
    expect(screen.getByText('Registered users')).toBeInTheDocument();
    expect(screen.getByText('Active / total kilns')).toBeInTheDocument();
    expect(screen.getByText(/120 vouchers · 45 invoices/i)).toBeInTheDocument();

    // Default tab shows Users
    expect(screen.getAllByText('Ramesh Kumar').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Suresh Accountant').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Owner').length).toBeGreaterThan(0);
  });

  it('switches between Users, Kilns, and Support history tabs', async () => {
    withPermissions('platform.tenants.view');
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Ganga Brickworks');

    // Switch to Kilns tab
    const kilnsTabBtn = screen.getByRole('button', { name: /kilns & sites/i });
    await user.click(kilnsTabBtn);

    expect(screen.getAllByText('Ganga North Kiln').length).toBeGreaterThan(0);
    expect(screen.getAllByText('GNK-01').length).toBeGreaterThan(0);
    expect(screen.getAllByText('South Depot').length).toBeGreaterThan(0);

    // Switch to Support history tab
    const supportTabBtn = screen.getByRole('button', { name: /support history/i });
    await user.click(supportTabBtn);

    expect(screen.getByText('Support session history')).toBeInTheDocument();
    expect(screen.getByText('No support sessions have been opened for this tenant.')).toBeInTheDocument();
  });

  it('respects permission gates for support and management actions', async () => {
    withPermissions('platform.tenants.view');
    renderPage();

    await screen.findByText('Ganga Brickworks');

    // Buttons requiring platform.support.request and platform.tenants.manage should be hidden
    expect(screen.queryByRole('button', { name: /open support session/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /suspend/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /require support approval/i })).toBeNull();
  });

  it('renders Open Support and Suspend actions when permissions are held', async () => {
    withPermissions('platform.tenants.view', 'platform.tenants.manage', 'platform.support.request');
    renderPage();

    await screen.findByText('Ganga Brickworks');

    expect(screen.getByRole('button', { name: /open support session/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /suspend/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /require support approval/i })).toBeInTheDocument();
  });

  it('allows platform admin to toggle support approval requirement', async () => {
    withPermissions('platform.tenants.view', 'platform.tenants.manage');
    updateTenantSettingsMock.mockResolvedValue({
      ...TENANT_DETAIL,
      requireSupportApproval: true,
    });

    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Ganga Brickworks');
    const toggleBtn = screen.getByRole('button', { name: /require support approval/i });
    await user.click(toggleBtn);

    expect(updateTenantSettingsMock).toHaveBeenCalledWith('tenant-1', {
      requireSupportApproval: true,
    });
  });
});
