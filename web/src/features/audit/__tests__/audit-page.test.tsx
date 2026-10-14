import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PERMISSIONS } from '@brics/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuditLogsPage from '@/app/(dashboard)/audit-logs/page';
import type { AuditEntry } from '../api';

const granted: string[] = [PERMISSIONS.AUDIT_VIEW];

vi.mock('@/features/auth/use-auth', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/use-auth')>('@/features/auth/use-auth');
  return {
    ...actual,
    useSession: () => ({
      can: (...codes: string[]) => codes.every((c) => granted.includes(c)),
    }),
  };
});

const { supportEntry, userEntry, systemEntry } = vi.hoisted(() => {
  const support: AuditEntry = {
    id: 'audit-1',
    companyId: 'company-1',
    userId: 'user-platform-1',
    entityName: 'sales_invoices',
    entityId: 'inv-123',
    action: 'UPDATE',
    beforeState: { status: 'draft' },
    afterState: { status: 'issued', reason: 'Emergency fix for stuck invoice' },
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    actorKind: 'platform_support',
    supportSessionId: 'sess-abc-123',
    createdAt: '2026-10-14T10:00:00.000Z',
  };

  const user: AuditEntry = {
    id: 'audit-2',
    companyId: 'company-1',
    userId: 'user-1',
    entityName: 'users',
    entityId: 'user-1',
    action: 'LOGIN',
    beforeState: null,
    afterState: { loginAt: '2026-10-14T09:00:00.000Z' },
    ipAddress: '192.168.1.2',
    userAgent: 'Mozilla/5.0',
    actorKind: 'user',
    supportSessionId: null,
    createdAt: '2026-10-14T09:00:00.000Z',
  };

  const system: AuditEntry = {
    id: 'audit-3',
    companyId: 'company-1',
    userId: null,
    entityName: 'financial_years',
    entityId: 'fy-2026',
    action: 'CREATE',
    beforeState: null,
    afterState: { code: 'FY26' },
    ipAddress: null,
    userAgent: null,
    actorKind: 'system',
    supportSessionId: null,
    createdAt: '2026-10-14T08:00:00.000Z',
  };

  return { supportEntry: support, userEntry: user, systemEntry: system };
});

vi.mock('@/features/users/hooks', async () => {
  const actual = await vi.importActual<typeof import('@/features/users/hooks')>('@/features/users/hooks');
  return {
    ...actual,
    useUsers: () => ({
      data: [
        { id: 'user-1', name: 'Ramesh Sharma' },
        { id: 'user-2', name: 'Suresh Patel' },
      ],
    }),
  };
});

vi.mock('@/features/audit/hooks', () => ({
  useAuditLogs: () => ({
    data: {
      items: [supportEntry, userEntry, systemEntry],
      meta: { page: 1, limit: 25, total: 3 },
    },
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
  }),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuditLogsPage />
    </QueryClientProvider>,
  );
}

describe('AuditLogsPage (Break-Glass Support Integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders standard user audit rows normally', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByRole('cell', { name: 'Ramesh Sharma' }).length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('LOGIN').length).toBeGreaterThan(0);
  });

  it('renders the yellow Support badge with session tooltip for platform_support entries', async () => {
    renderPage();

    const supportBadges = await screen.findAllByText('Support');
    expect(supportBadges.length).toBeGreaterThan(0);
    const supportBadge = supportBadges[0]!;
    expect(supportBadge.className).toContain('bg-gold-100');

    // Title should contain the support session ID and reason
    const title = supportBadge.getAttribute('title');
    expect(title).toContain('Support session: sess-abc-123');
    expect(title).toContain('Emergency fix for stuck invoice');
  });

  it('renders muted System badge for system actorKind entries', async () => {
    renderPage();

    const systemBadges = await screen.findAllByText('System');
    expect(systemBadges.length).toBeGreaterThan(0);
    expect(systemBadges[0]!.className).toContain('bg-surface-muted');
  });

  it('filters out non-support rows when "Show only support entries" is checked', async () => {
    const user = userEvent.setup();
    renderPage();

    // Verify initial state renders user, support, and system entries in the table
    await screen.findAllByRole('cell', { name: 'Ramesh Sharma' });
    expect(screen.getAllByRole('cell', { name: 'Support' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('cell', { name: 'System' }).length).toBeGreaterThan(0);

    const checkbox = screen.getByRole('checkbox', { name: /show only support entries/i });
    expect(checkbox).not.toBeChecked();

    // Click checkbox
    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    // Only support entries remain in the table
    await waitFor(() => {
      expect(screen.queryByRole('cell', { name: 'Ramesh Sharma' })).toBeNull();
      expect(screen.queryByRole('cell', { name: 'System' })).toBeNull();
      expect(screen.getAllByRole('cell', { name: 'Support' }).length).toBeGreaterThan(0);
    });

    // Unchecking shows all rows again
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();

    await waitFor(() => {
      expect(screen.getAllByRole('cell', { name: 'Ramesh Sharma' }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('cell', { name: 'System' }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('cell', { name: 'Support' }).length).toBeGreaterThan(0);
    });
  });
});
