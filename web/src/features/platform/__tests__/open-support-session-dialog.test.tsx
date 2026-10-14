import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TenantSummaryDto } from '@brics/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { clearTokens, setTokens } from '@/lib/auth-token';
import { restorePlatformTokens } from '@/lib/support-token-store';
import { useAuthStore } from '@/stores/auth-store';
import { OpenSupportSessionDialog } from '../components/open-support-session-dialog';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const openMock = vi.fn();
vi.mock('../api', () => ({
  openSupportSession: (dto: unknown) => openMock(dto),
}));

const TENANT: TenantSummaryDto = {
  id: 't1',
  name: 'Alpha Bricks',
  stateCode: '09',
  status: 'active',
  planName: 'starter',
  trialEndsAt: null,
  lastActiveAt: null,
  createdAt: '2026-10-14T00:00:00.000Z',
};

function renderDialog(open = true) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const onClose = vi.fn();
  const utils = render(
    <QueryClientProvider client={client}>
      <OpenSupportSessionDialog tenant={TENANT} open={open} onClose={onClose} />
    </QueryClientProvider>,
  );
  return { ...utils, onClose };
}

describe('OpenSupportSessionDialog (PLT-07)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTokens();
    window.sessionStorage.clear();
    window.localStorage.clear();
    useAuthStore.getState().reset();
  });

  it('validates short reason (< 3 chars) and does not call openSupportSession', async () => {
    renderDialog();

    await userEvent.type(screen.getByRole('textbox', { name: /reason/i }), 'ab');
    await userEvent.click(screen.getByRole('button', { name: /open session/i }));

    expect(await screen.findByText(/a reason is required/i)).toBeInTheDocument();
    expect(openMock).not.toHaveBeenCalled();
  });

  it('successfully opens support session, backs up platform tokens, sets auth session and redirects to /dashboard', async () => {
    setTokens({ accessToken: 'plat-access-token', refreshToken: 'plat-refresh-token' });

    openMock.mockResolvedValue({
      session: {
        id: 'sess-1',
        tenantId: 't1',
        tenantName: 'Alpha Bricks',
        platformUserId: 'u1',
        platformUserName: 'Admin User',
        reason: 'Investigating payroll ledger discrepancy',
        openedAt: '2026-10-14T10:00:00.000Z',
        expiresAt: '2026-10-14T12:00:00.000Z',
        closedAt: null,
        closedBy: null,
      },
      auth: {
        accessToken: 'support-access-token',
        refreshToken: 'support-refresh-token',
        user: {
          id: 'u1',
          email: 'admin@brics.test',
          mobile: '9876543210',
          name: 'Admin User',
          roleCode: 'platform_support',
          permissions: ['accounting.view', 'accounting.edit'],
          isSuperAdmin: false,
        },
        company: {
          id: 't1',
          name: 'Alpha Bricks',
          gstin: null,
          stateCode: '09',
          gstScheme: 'regular',
        },
        sites: [],
      },
    });

    const { onClose } = renderDialog();

    await userEvent.type(screen.getByRole('textbox', { name: /reason/i }), 'Investigating payroll ledger discrepancy');
    await userEvent.click(screen.getByRole('button', { name: /open session/i }));

    await waitFor(() => {
      expect(openMock).toHaveBeenCalledWith({
        tenantId: 't1',
        reason: 'Investigating payroll ledger discrepancy',
      });
      // Platform admin tokens must be backed up in sessionStorage
      expect(restorePlatformTokens()).toEqual({
        accessToken: 'plat-access-token',
        refreshToken: 'plat-refresh-token',
      });
      // Auth store now holds the switched tenant session
      expect(useAuthStore.getState().user?.roleCode).toBe('platform_support');
      expect(useAuthStore.getState().company?.id).toBe('t1');
      expect(onClose).toHaveBeenCalled();
      expect(pushMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('displays server error in an Alert banner', async () => {
    openMock.mockRejectedValue(
      new ApiError(400, 'BAD_REQUEST', 'An active support session already exists for this tenant'),
    );

    renderDialog();

    await userEvent.type(screen.getByRole('textbox', { name: /reason/i }), 'Investigating payroll ledger discrepancy');
    await userEvent.click(screen.getByRole('button', { name: /open session/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists for this tenant/i);
    expect(pushMock).not.toHaveBeenCalled();
  });
});
