/**
 * Token custody (ADR-016).
 *
 * The access token lives **only here, in memory** — never in localStorage, so a
 * page that is briefly compromised cannot leave a 15-minute token behind. The
 * refresh token is persisted, because a hard reload has to be able to recover
 * the session; it is rotated on every use (ADR-015), so a stolen one is
 * single-use and its reuse is detectable server-side.
 *
 * Plain module state, deliberately not a React store: `api-client` needs the
 * token on every request and must not import the Zustand store, which imports
 * the feature API, which imports `api-client`.
 */

const REFRESH_KEY = 'brics_refresh';

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(REFRESH_KEY);
  } catch {
    // Private mode or blocked site data: the session just won't survive a reload.
    return null;
  }
}

export function setRefreshToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) window.localStorage.setItem(REFRESH_KEY, token);
    else window.localStorage.removeItem(REFRESH_KEY);
  } catch {
    // Ignore: a session that cannot be persisted still works until reload.
  }
}

export function setTokens(tokens: { accessToken: string; refreshToken: string }): void {
  setAccessToken(tokens.accessToken);
  setRefreshToken(tokens.refreshToken);
}

export function clearTokens(): void {
  setAccessToken(null);
  setRefreshToken(null);
}

/** True when a reload might still be recoverable via `POST /auth/refresh`. */
export function hasPersistedSession(): boolean {
  return getRefreshToken() !== null;
}
