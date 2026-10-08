'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import type { LoginDto } from '@brics/shared';
import { ApiError } from '@/lib/api-client';
import { hasPersistedSession, setTokens } from '@/lib/auth-token';
import { hasPermissions, useAuthStore } from '@/stores/auth-store';
import { fetchCurrentCompany, fetchSites } from '@/features/company/api';
import * as authApi from './api';

/** Current session, plus a permission helper for conditional UI. */
export function useSession() {
  const { status, user, company, sites, activeSiteId } = useAuthStore();
  const can = useCallback((...codes: string[]) => hasPermissions(user, ...codes), [user]);
  return { status, user, company, sites, activeSiteId, can, isAuthenticated: status === 'authenticated' };
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: LoginDto) => authApi.login(dto),
    onSuccess: (session) => {
      setSession(session);
      queryClient.clear();
      router.replace('/dashboard');
    },
  });
}

export function useLogout() {
  const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated);
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    // A failed server logout must still clear the client, or the user is stuck
    // signed in with a token they asked to throw away.
    mutationFn: () => authApi.logout().catch(() => ({ success: false })),
    onSettled: () => {
      setUnauthenticated();
      queryClient.clear();
      router.replace('/login');
    },
  });
}

/**
 * Restores a session on boot: the refresh token survives a reload, the access
 * token does not (ADR-016).
 *
 * The guard is module-level, not a ref, and the work is never cancelled. React
 * 18 StrictMode mounts effects twice in development (mount → cleanup → mount);
 * a per-component ref plus a `cancelled` flag deadlocked — the first mount
 * started the work and its cleanup discarded the result, while the second mount
 * saw the guard and skipped, so the spinner never went away. Refresh tokens are
 * single-use, so the request itself must still happen only once.
 */
let restoreStarted = false;

export function useRestoreSession() {
  const status = useAuthStore((s) => s.status);
  const setSession = useAuthStore((s) => s.setSession);
  const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated);

  useEffect(() => {
    if (restoreStarted || status !== 'loading') return;
    restoreStarted = true;

    if (!hasPersistedSession()) {
      setUnauthenticated();
      return;
    }

    void (async () => {
      try {
        const tokens = await authApi.refreshSession();
        setTokens(tokens);

        // `/auth/me` returns JWT claims only, so the company and kilns that
        // `POST /auth/login` would have included are fetched alongside it.
        const [me, company, sites] = await Promise.all([authApi.fetchMe(), fetchCurrentCompany(), fetchSites()]);

        setSession({
          ...tokens,
          user: {
            id: me.sub,
            email: me.email,
            mobile: me.mobile,
            name: me.name,
            roleCode: me.roleCode,
            permissions: me.permissions,
            isSuperAdmin: me.isSuperAdmin,
          },
          company: {
            id: company.id,
            name: company.name,
            gstin: company.gstin,
            stateCode: company.stateCode,
          },
          sites: sites.map((s) => ({ id: s.id, name: s.name, code: s.code, type: s.type })),
        });
      } catch {
        setUnauthenticated();
      }
    })();
  }, [status, setSession, setUnauthenticated]);
}

/** Turns a 400 from the backend's Zod pipe into per-field messages. */
export function fieldErrorsOf(error: unknown): Record<string, string> {
  return error instanceof ApiError ? error.fieldErrors : {};
}

export function messageOf(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}
