import { setTokens } from './auth-token';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Storage key for backing up platform admin tokens during a support session.
 * Lives in sessionStorage: survives reload within a tab, cleared on tab close.
 */
const PLATFORM_TOKENS_BACKUP_KEY = 'brics_platform_tokens_backup';

export interface PlatformTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Backs up the platform admin's tokens before switching into a tenant's support session.
 */
export function backupPlatformTokens(tokens: PlatformTokens): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(PLATFORM_TOKENS_BACKUP_KEY, JSON.stringify(tokens));
  } catch {
    // Private mode or blocked storage
  }
}

/**
 * Reads the backed-up platform tokens from sessionStorage, if present.
 */
export function restorePlatformTokens(): PlatformTokens | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(PLATFORM_TOKENS_BACKUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlatformTokens>;
    if (typeof parsed.accessToken === 'string' && typeof parsed.refreshToken === 'string') {
      return { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Removes the backed-up platform tokens from sessionStorage.
 */
export function clearBackup(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(PLATFORM_TOKENS_BACKUP_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * True if a platform tokens backup exists in sessionStorage.
 */
export function hasPlatformBackup(): boolean {
  return restorePlatformTokens() !== null;
}

/**
 * Restores the backed-up platform tokens into auth-token custody, decodes the JWT
 * payload to immediately re-populate useAuthStore with the platform admin user,
 * and leaves the user in an authenticated state for the admin shell.
 */
export function restorePlatformSession(): boolean {
  const tokens = restorePlatformTokens();
  if (!tokens) return false;

  setTokens(tokens);

  try {
    const parts = tokens.accessToken.split('.');
    const rawPayload = parts[1];
    if (rawPayload) {
      const base64 = rawPayload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const json = decodeURIComponent(
        atob(padded)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );
      const claims = JSON.parse(json) as {
        sub: string;
        email: string | null;
        mobile: string;
        name: string;
        roleCode: string;
        permissions?: string[];
        isSuperAdmin?: boolean;
      };

      useAuthStore.setState({
        status: 'authenticated',
        user: {
          id: claims.sub,
          email: claims.email,
          mobile: claims.mobile,
          name: claims.name,
          roleCode: claims.roleCode,
          permissions: claims.permissions ?? [],
          isSuperAdmin: Boolean(claims.isSuperAdmin),
        },
        company: null,
        sites: [],
        activeSiteId: null,
      });
    }
  } catch {
    // If decoding fails, tokens are still set; session restoration/refresh will handle the rest.
  }

  return true;
}
