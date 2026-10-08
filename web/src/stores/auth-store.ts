import { create } from 'zustand';
import type { AuthResponseDto } from '@brics/shared';
import { clearTokens, setTokens } from '@/lib/auth-token';

export type AuthStatus =
  /** Boot: we have not yet decided whether a stored session can be restored. */
  'loading' | 'authenticated' | 'unauthenticated';

export type SessionCompany = AuthResponseDto['company'];
export type SessionSite = AuthResponseDto['sites'][number];
export type SessionProfile = AuthResponseDto['user'];

interface AuthState {
  status: AuthStatus;
  user: SessionProfile | null;
  company: SessionCompany | null;
  sites: SessionSite[];
  /** Kiln the user is working in. Null means "all kilns of the company". */
  activeSiteId: string | null;

  setSession: (session: AuthResponseDto) => void;
  setUnauthenticated: () => void;
  setActiveSite: (siteId: string | null) => void;
  reset: () => void;
}

/**
 * Who is signed in, which company they are in, and which kilns they may touch.
 * Tokens live in `lib/auth-token` (ADR-016), not here — this store is only the
 * shape the UI renders.
 *
 * Always starts `loading`, and deliberately does **not** read `localStorage` here:
 * the server has no storage, so deciding the initial status from it made the
 * server render "unauthenticated" while the client rendered "loading", which
 * React reported as a hydration mismatch. `useRestoreSession` resolves the real
 * status on the client, where storage exists.
 */
export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,
  company: null,
  sites: [],
  activeSiteId: null,

  setSession: (session) => {
    setTokens({ accessToken: session.accessToken, refreshToken: session.refreshToken });
    set((state) => ({
      status: 'authenticated',
      user: session.user,
      company: session.company,
      sites: session.sites,
      // Keep the chosen kiln only if it still exists in the new company.
      activeSiteId: session.sites.some((s) => s.id === state.activeSiteId) ? state.activeSiteId : null,
    }));
  },

  setUnauthenticated: () => {
    clearTokens();
    set({ status: 'unauthenticated', user: null, company: null, sites: [], activeSiteId: null });
  },

  setActiveSite: (siteId) => set({ activeSiteId: siteId }),

  reset: () => {
    clearTokens();
    set({ status: 'unauthenticated', user: null, company: null, sites: [], activeSiteId: null });
  },
}));

/** `true` when the signed-in user holds every code listed. Super admins pass. */
export function hasPermissions(user: SessionProfile | null, ...codes: string[]): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  return codes.every((code) => user.permissions.includes(code));
}
