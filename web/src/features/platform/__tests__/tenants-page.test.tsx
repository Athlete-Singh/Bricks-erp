import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TenantSummaryDto } from '@brics/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminTenantsPage from '@/app/admin/tenants/page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));

const sessionMock = vi.fn();
vi.mock('@/features/auth/use-auth', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/use-auth')>('@/features/auth/use-auth');
  return { ...actual, useSession: () => sessionMock() };
});

const fetchTenantsMock = vi.fn();
const reactivateMock = vi.fn();
vi.mock('../api', () => ({
  fetchTenants: () => fetchTenantsMock(),
  reactivateTenant: (id: string) => reactivateMock(id),
  createTenant: vi.fn(),
  suspendTenant: vi.fn(),
}));

const TENANTS: TenantSummaryDto[] = [
  {
    id: 't1',
    name: 'Alpha Bricks',
    stateCode: '09',
    status: 'active',
    planName: 'starter',
    trialEndsAt: null,
    lastActiveAt: null,
    requireSupportApproval: false,
    supportAccessGrantedUntil: null,
    createdAt: '2026-10-14T00:00:00.000Z',
  },
  {
    id: 't2',
    name: 'Beta Bricks',
    stateCode: '27',
    status: 'suspended',
    planName: null,
    trialEndsAt: null,
    lastActiveAt: null,
    requireSupportApproval: true,
    supportAccessGrantedUntil: null,
    createdAt: '2026-10-10T00:00:00.000Z',
  },
];

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
      <AdminTenantsPage />
    </QueryClientProvider>,
  );
}

describe('AdminTenantsPage (PLT-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchTenantsMock.mockResolvedValue(TENANTS);
  });

  it("shows tenant metadata only — never money, never the client's own parties", async () => {
    withPermissions('platform.tenants.view', 'platform.tenants.manage');
    renderPage();

    await screen.findAllByText('Alpha Bricks');
    // No currency, revenue, outstanding, parties columns are rendered.
    expect(screen.queryByText(/₹|revenue|outstanding|customer/i)).toBeNull();
    expect(screen.getAllByText(/09/).length).toBeGreaterThan(0);
  });

  it('hides the manage controls when the user only has `platform.tenants.view`', async () => {
    withPermissions('platform.tenants.view');
    renderPage();

    await screen.findAllByText('Alpha Bricks');
    expect(screen.queryByRole('button', { name: /onboard a tenant/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /suspend alpha bricks/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /reactivate beta bricks/i })).toBeNull();
  });

  it('offers Reactivate on a suspended tenant and Suspend on an active one', async () => {
    withPermissions('platform.tenants.view', 'platform.tenants.manage');
    renderPage();

    await screen.findAllByText('Alpha Bricks');
    expect(screen.getAllByRole('button', { name: /suspend alpha bricks/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /reactivate beta bricks/i }).length).toBeGreaterThan(0);
  });

  it('filters the list client-side by name', async () => {
    withPermissions('platform.tenants.view', 'platform.tenants.manage');
    renderPage();

    await screen.findAllByText('Alpha Bricks');
    await userEvent.type(screen.getByRole('searchbox'), 'beta');

    await waitFor(() => {
      expect(screen.queryByText('Alpha Bricks')).toBeNull();
      expect(screen.getAllByText('Beta Bricks').length).toBeGreaterThan(0);
    });
  });

  it('reactivates a suspended tenant', async () => {
    withPermissions('platform.tenants.view', 'platform.tenants.manage');
    reactivateMock.mockResolvedValue({ ...TENANTS[1], status: 'active' });
    renderPage();

    await screen.findAllByText('Beta Bricks');
    const buttons = screen.getAllByRole('button', { name: /reactivate beta bricks/i });
    await userEvent.click(buttons[0]!);

    await waitFor(() => expect(reactivateMock).toHaveBeenCalledWith('t2'));
  });
});
