import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { SupportSessionDto } from '@brics/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TenantSupportHistory } from '../components/tenant-support-history';

const sessionMock = vi.fn();
vi.mock('@/features/auth/use-auth', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/use-auth')>('@/features/auth/use-auth');
  return { ...actual, useSession: () => sessionMock() };
});

const fetchTenantSupportSessionsMock = vi.fn();
vi.mock('../api', () => ({
  fetchTenantSupportSessions: (tenantId: string) => fetchTenantSupportSessionsMock(tenantId),
}));

const SESSIONS: SupportSessionDto[] = [
  {
    id: 's1',
    tenantId: 't1',
    tenantName: 'Alpha Bricks',
    platformUserId: 'u1',
    platformUserName: 'Jane Admin',
    reason: 'Investigate inventory discrepancy',
    openedAt: '2026-10-14T08:00:00.000Z',
    expiresAt: '2026-10-14T10:00:00.000Z',
    closedAt: null,
    closedBy: null,
  },
  {
    id: 's2',
    tenantId: 't1',
    tenantName: 'Alpha Bricks',
    platformUserId: 'u2',
    platformUserName: 'Bob Operator',
    reason: 'Fix tax ledger posting',
    openedAt: '2026-10-12T10:00:00.000Z',
    expiresAt: '2026-10-12T12:00:00.000Z',
    closedAt: '2026-10-12T11:30:00.000Z',
    closedBy: 'manual',
  },
];

function withPermissions(...codes: string[]) {
  sessionMock.mockReturnValue({
    status: 'authenticated',
    user: { permissions: codes },
    can: (...needed: string[]) => needed.every((c) => codes.includes(c)),
  });
}

function renderHistory(tenantId = 't1') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TenantSupportHistory tenantId={tenantId} />
    </QueryClientProvider>,
  );
}

describe('TenantSupportHistory (PLT-07)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withPermissions('platform.tenants.view');
  });

  it('renders support session rows with correct columns including Active badge, Opener, Reason and Closed by', async () => {
    fetchTenantSupportSessionsMock.mockResolvedValue(SESSIONS);
    renderHistory('t1');

    // Title / heading
    expect(await screen.findByText('Support session history')).toBeInTheDocument();

    // Check openers (DataTable renders mobile card dl and desktop table rows)
    expect((await screen.findAllByText('Jane Admin')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bob Operator').length).toBeGreaterThan(0);

    // Check reasons
    expect(screen.getAllByText('Investigate inventory discrepancy').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Fix tax ledger posting').length).toBeGreaterThan(0);

    // Check Active badge for unclosed session
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);

    // Check closed by for closed session
    expect(screen.getAllByText('manual').length).toBeGreaterThan(0);
  });

  it('renders empty state when no sessions have occurred', async () => {
    fetchTenantSupportSessionsMock.mockResolvedValue([]);
    renderHistory('t1');

    expect(await screen.findByText(/no support sessions yet/i)).toBeInTheDocument();
    expect(screen.getByText(/no support sessions have been opened for this tenant/i)).toBeInTheDocument();
  });

  it('is gated and renders nothing when the user lacks platform.tenants.view permission', () => {
    withPermissions('some.other.permission');
    fetchTenantSupportSessionsMock.mockResolvedValue(SESSIONS);
    const { container } = renderHistory('t1');

    expect(container).toBeEmptyDOMElement();
    expect(fetchTenantSupportSessionsMock).not.toHaveBeenCalled();
  });
});
