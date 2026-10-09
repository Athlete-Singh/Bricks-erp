import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthResponseDto } from '@brics/shared';
import { getAccessToken, getRefreshToken } from '@/lib/auth-token';
import { hasPermissions, useAuthStore } from './auth-store';

const session = (overrides: Partial<AuthResponseDto> = {}): AuthResponseDto => ({
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  user: {
    id: 'u1',
    email: 'owner@kiln.test',
    mobile: '9000000000',
    name: 'Owner',
    roleCode: 'owner',
    permissions: ['company.view', 'users.manage'],
    isSuperAdmin: false,
  },
  company: { id: 'c1', name: 'Shri Ram Bricks', gstin: null, stateCode: '09', gstScheme: 'regular_12_itc' as const },
  sites: [
    { id: 's1', name: 'Kiln 1', code: 'K1', type: 'kiln' },
    { id: 's2', name: 'Kiln 2', code: 'K2', type: 'kiln' },
  ],
  ...overrides,
});

describe('auth store', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().reset();
  });

  it('stores the session and puts the tokens where ADR-016 says', () => {
    useAuthStore.getState().setSession(session());

    const state = useAuthStore.getState();
    expect(state.status).toBe('authenticated');
    expect(state.user?.name).toBe('Owner');
    expect(state.company?.name).toBe('Shri Ram Bricks');
    expect(state.sites).toHaveLength(2);

    expect(getAccessToken()).toBe('access-1');
    expect(getRefreshToken()).toBe('refresh-1');
    // The access token must never be persisted.
    expect(JSON.stringify(localStorage)).not.toContain('access-1');
  });

  it('starts as loading without reading storage, so server and client agree', async () => {
    // Regression: deciding the initial status from localStorage made the server
    // render "unauthenticated" and the client "loading" — a hydration mismatch.
    localStorage.setItem('brics_refresh', 'refresh-1');
    vi.resetModules();

    const fresh = await import('./auth-store');
    expect(fresh.useAuthStore.getState().status).toBe('loading');
  });

  it('clears tokens and session on reset', () => {
    useAuthStore.getState().setSession(session());
    useAuthStore.getState().reset();

    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(useAuthStore.getState().user).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it('keeps the selected kiln when it still exists after switching company', () => {
    useAuthStore.getState().setSession(session());
    useAuthStore.getState().setActiveSite('s2');

    useAuthStore.getState().setSession(session({ accessToken: 'access-2' }));

    expect(useAuthStore.getState().activeSiteId).toBe('s2');
  });

  it('drops the selected kiln when the new company does not have it', () => {
    useAuthStore.getState().setSession(session());
    useAuthStore.getState().setActiveSite('s2');

    useAuthStore.getState().setSession(
      session({
        company: { id: 'c2', name: 'Other Bricks', gstin: null, stateCode: '27', gstScheme: 'regular_12_itc' as const },
        sites: [{ id: 's9', name: 'Other Kiln', code: 'K9', type: 'kiln' }],
      }),
    );

    // Otherwise the UI would keep filtering by a kiln of the previous tenant.
    expect(useAuthStore.getState().activeSiteId).toBeNull();
  });
});

describe('hasPermissions', () => {
  const user = session().user;

  it('is false with no user', () => {
    expect(hasPermissions(null, 'company.view')).toBe(false);
  });

  it('requires every code, not just one', () => {
    expect(hasPermissions(user, 'company.view')).toBe(true);
    expect(hasPermissions(user, 'company.view', 'users.manage')).toBe(true);
    expect(hasPermissions(user, 'company.view', 'company.manage')).toBe(false);
  });

  it('lets a super admin through without the codes', () => {
    expect(hasPermissions({ ...user, permissions: [], isSuperAdmin: true }, 'company.manage')).toBe(true);
  });
});
