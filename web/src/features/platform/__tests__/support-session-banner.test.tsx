import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupportSessionDto } from '@brics/shared';
import { SupportSessionBanner, truncateReason } from '../components/support-session-banner';
import * as platformApi from '../api';
import * as platformHooks from '../hooks';
import * as supportTokenStore from '@/lib/support-token-store';
import * as useAuthModule from '@/features/auth/use-auth';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('../api', () => ({
  closeSupportSession: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/support-token-store', () => ({
  restorePlatformTokens: vi.fn(),
  restorePlatformSession: vi.fn(),
  clearBackup: vi.fn(),
  hasPlatformBackup: vi.fn().mockReturnValue(true),
}));

describe('SupportSessionBanner', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const renderBanner = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <SupportSessionBanner />
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('role gating', () => {
    it('returns null when the user roleCode is not platform_support (e.g. owner)', () => {
      vi.spyOn(useAuthModule, 'useSession').mockReturnValue({
        status: 'authenticated',
        isAuthenticated: true,
        user: {
          id: 'u-owner-1',
          name: 'Kiln Owner',
          email: 'owner@kiln.test',
          mobile: '9876543210',
          roleCode: 'owner',
          permissions: ['company.view'],
          isSuperAdmin: false,
        },
        company: { id: 'c1', name: 'Shri Ram Bricks', gstin: null, stateCode: '09', gstScheme: 'regular_12_itc' },
        sites: [],
        activeSiteId: null,
        can: () => true,
      });

      vi.spyOn(platformHooks, 'useActiveSupportSessionForMe').mockReturnValue({
        activeSession: null,
        session: null,
      } as ReturnType<typeof platformHooks.useActiveSupportSessionForMe>);

      renderBanner();

      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.queryByText(/Support session/i)).toBeNull();
    });
  });

  describe('active session rendering', () => {
    const longReason =
      'Investigating production ledger mismatch between soil procurement batch and unburnt bricks chamber 4';

    const activeSession: SupportSessionDto = {
      id: 'session-uuid-1',
      tenantId: 'tenant-uuid-1',
      tenantName: 'Vikas Bricks Industry',
      platformUserId: 'platform-user-1',
      platformUserName: 'Agent Sharma',
      reason: longReason,
      openedAt: new Date(Date.now() - 1000 * 60).toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 30 + 1000 * 15).toISOString(), // 30m 15s remaining
      closedAt: null,
      closedBy: null,
    };

    beforeEach(() => {
      vi.spyOn(useAuthModule, 'useSession').mockReturnValue({
        status: 'authenticated',
        isAuthenticated: true,
        user: {
          id: 'u-support-1',
          name: 'Agent Sharma',
          email: 'support@brics.test',
          mobile: '9876543210',
          roleCode: 'platform_support',
          permissions: ['company.view', 'accounts.view'],
          isSuperAdmin: false,
        },
        company: {
          id: 'tenant-uuid-1',
          name: 'Vikas Bricks Industry',
          gstin: null,
          stateCode: '09',
          gstScheme: 'regular_12_itc',
        },
        sites: [],
        activeSiteId: null,
        can: () => true,
      });

      vi.spyOn(platformHooks, 'useActiveSupportSessionForMe').mockReturnValue({
        activeSession,
        session: activeSession,
      } as ReturnType<typeof platformHooks.useActiveSupportSessionForMe>);
    });

    it('renders the tenant name, truncated reason, and countdown when roleCode is platform_support', () => {
      renderBanner();

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Support session')).toBeInTheDocument();
      expect(screen.getByText('Vikas Bricks Industry')).toBeInTheDocument();

      const expectedTruncated = truncateReason(longReason);
      expect(screen.getByText(expectedTruncated)).toBeInTheDocument();

      // Countdown should display HH:MM:SS format (e.g. 00:30:15)
      expect(screen.getByText(/00:30:1[4-6]/)).toBeInTheDocument();
    });

    it('falls back to company name and default reason when session is still loading or not yet found', () => {
      vi.spyOn(platformHooks, 'useActiveSupportSessionForMe').mockReturnValue({
        activeSession: null,
        session: null,
        isLoading: true,
      } as ReturnType<typeof platformHooks.useActiveSupportSessionForMe>);

      renderBanner();

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Vikas Bricks Industry')).toBeInTheDocument();
      expect(screen.getByText('Active session')).toBeInTheDocument();
    });

    it('clamps countdown at 00:00:00 and shows (Expired) when session is expired', () => {
      const expiredSession: SupportSessionDto = {
        ...activeSession,
        expiresAt: new Date(Date.now() - 5000).toISOString(),
      };

      vi.spyOn(platformHooks, 'useActiveSupportSessionForMe').mockReturnValue({
        activeSession: expiredSession,
        session: expiredSession,
      } as ReturnType<typeof platformHooks.useActiveSupportSessionForMe>);

      renderBanner();

      expect(screen.getByText('00:00:00')).toBeInTheDocument();
      expect(screen.getByText('(Expired)')).toBeInTheDocument();
    });
  });

  describe('actions', () => {
    const activeSession: SupportSessionDto = {
      id: 'session-uuid-99',
      tenantId: 'tenant-uuid-1',
      tenantName: 'Vikas Bricks Industry',
      platformUserId: 'platform-user-1',
      platformUserName: 'Agent Sharma',
      reason: 'Assisting with GST voucher issue',
      openedAt: new Date(Date.now() - 5000).toISOString(),
      expiresAt: new Date(Date.now() + 600000).toISOString(),
      closedAt: null,
      closedBy: null,
    };

    beforeEach(() => {
      vi.spyOn(useAuthModule, 'useSession').mockReturnValue({
        status: 'authenticated',
        isAuthenticated: true,
        user: {
          id: 'u-support-1',
          name: 'Agent Sharma',
          email: 'support@brics.test',
          mobile: '9876543210',
          roleCode: 'platform_support',
          permissions: ['company.view'],
          isSuperAdmin: false,
        },
        company: {
          id: 'tenant-uuid-1',
          name: 'Vikas Bricks Industry',
          gstin: null,
          stateCode: '09',
          gstScheme: 'regular_12_itc',
        },
        sites: [],
        activeSiteId: null,
        can: () => true,
      });

      vi.spyOn(platformHooks, 'useActiveSupportSessionForMe').mockReturnValue({
        activeSession,
        session: activeSession,
      } as ReturnType<typeof platformHooks.useActiveSupportSessionForMe>);
    });

    it('"Close session" button calls closeSupportSession, restores tokens, and router.push("/admin/tenants")', async () => {
      renderBanner();

      const closeButton = screen.getByRole('button', { name: /Close session/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(platformApi.closeSupportSession).toHaveBeenCalledWith('session-uuid-99');
        expect(supportTokenStore.restorePlatformTokens).toHaveBeenCalled();
        expect(supportTokenStore.restorePlatformSession).toHaveBeenCalled();
        expect(supportTokenStore.clearBackup).toHaveBeenCalled();
        expect(pushMock).toHaveBeenCalledWith('/admin/tenants');
      });
    });

    it('"Return to admin" button restores tokens and router.push("/admin/tenants") without closing the session', () => {
      renderBanner();

      const returnButton = screen.getByRole('button', { name: /Return to admin/i });
      fireEvent.click(returnButton);

      expect(platformApi.closeSupportSession).not.toHaveBeenCalled();
      expect(supportTokenStore.restorePlatformSession).toHaveBeenCalled();
      expect(supportTokenStore.clearBackup).not.toHaveBeenCalled();
      expect(pushMock).toHaveBeenCalledWith('/admin/tenants');
    });
  });

  describe('truncateReason utility', () => {
    it('returns original string if length is less than or equal to maxLength', () => {
      expect(truncateReason('Short reason', 50)).toBe('Short reason');
    });

    it('truncates and adds ellipsis if longer than maxLength', () => {
      const long = 'This is a very long reason that exceeds thirty characters';
      const truncated = truncateReason(long, 30);
      expect(truncated.endsWith('…')).toBe(true);
      expect(truncated.length).toBeLessThanOrEqual(31);
    });
  });
});
