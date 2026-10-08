import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiClient } from './api-client';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './auth-token';

const BASE = 'http://localhost:4000/api/v1';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const ok = (data: unknown) => jsonResponse(200, { data });
const okPaged = (data: unknown, meta: unknown) => jsonResponse(200, { data, meta });
const unauthorized = () => jsonResponse(401, { error: { code: 'UNAUTHENTICATED', message: 'Token expired' } });

describe('apiClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clearTokens();
    localStorage.clear();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('envelope', () => {
    it('returns the payload, not the envelope (ADR-017)', async () => {
      fetchMock.mockResolvedValueOnce(ok({ id: 'c1', name: 'Shri Ram Bricks' }));

      await expect(apiClient.get('/companies/current')).resolves.toEqual({
        id: 'c1',
        name: 'Shri Ram Bricks',
      });
    });

    it('keeps meta for paginated endpoints', async () => {
      fetchMock.mockResolvedValueOnce(okPaged([{ id: 'a1' }], { page: 2, limit: 25, total: 51 }));

      await expect(apiClient.getPaged('/audit-logs?page=2')).resolves.toEqual({
        items: [{ id: 'a1' }],
        meta: { page: 2, limit: 25, total: 51 },
      });
    });

    it('synthesises meta when a list endpoint does not paginate yet', async () => {
      fetchMock.mockResolvedValueOnce(ok([{ id: 's1' }, { id: 's2' }]));

      const result = await apiClient.getPaged('/sites');
      expect(result.meta).toEqual({ page: 1, limit: 2, total: 2 });
    });
  });

  describe('errors', () => {
    it('throws ApiError carrying the backend code and message', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(403, { error: { code: 'FORBIDDEN', message: 'You do not have access to this company' } }),
      );

      const error = await apiClient.get('/companies/other').catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(403);
      expect((error as ApiError).isForbidden).toBe(true);
      expect((error as ApiError).message).toBe('You do not have access to this company');
    });

    it('exposes 400 validation details keyed by field, for the form', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(400, {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Validation failed',
            details: [{ field: 'password', message: 'Password must be at least 6 characters' }],
          },
        }),
      );

      const error = (await apiClient.post('/auth/login', {}).catch((e: unknown) => e)) as ApiError;
      expect(error.fieldErrors).toEqual({ password: 'Password must be at least 6 characters' });
    });
  });

  describe('token refresh on 401', () => {
    it('refreshes once, then retries the original request', async () => {
      setTokens({ accessToken: 'expired', refreshToken: 'refresh-1' });

      fetchMock
        .mockResolvedValueOnce(unauthorized())
        .mockResolvedValueOnce(ok({ accessToken: 'fresh', refreshToken: 'refresh-2' }))
        .mockResolvedValueOnce(ok([{ id: 'u1' }]));

      await expect(apiClient.get('/users')).resolves.toEqual([{ id: 'u1' }]);

      expect(fetchMock.mock.calls[1]?.[0]).toBe(`${BASE}/auth/refresh`);
      // The rotated pair replaced the old one (ADR-015).
      expect(getAccessToken()).toBe('fresh');
      expect(getRefreshToken()).toBe('refresh-2');
      // The retry carried the new token, not the expired one.
      const retryHeaders = fetchMock.mock.calls[2]?.[1]?.headers as Record<string, string>;
      expect(retryHeaders.Authorization).toBe('Bearer fresh');
    });

    it('refreshes only once when several requests 401 together', async () => {
      // Refresh tokens are single-use, so a second concurrent refresh would
      // present an already-revoked token and sign the user out.
      setTokens({ accessToken: 'expired', refreshToken: 'refresh-1' });

      fetchMock.mockImplementation((url: string) => {
        if (url.endsWith('/auth/refresh')) {
          return Promise.resolve(ok({ accessToken: 'fresh', refreshToken: 'refresh-2' }));
        }
        const headers = fetchMock.mock.calls.at(-1)?.[1]?.headers as Record<string, string>;
        return Promise.resolve(headers?.Authorization === 'Bearer fresh' ? ok({ ok: true }) : unauthorized());
      });

      await Promise.all([apiClient.get('/users'), apiClient.get('/sites'), apiClient.get('/companies')]);

      const refreshCalls = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/auth/refresh'));
      expect(refreshCalls).toHaveLength(1);
    });

    it('clears the session and surfaces 401 when the refresh token is rejected', async () => {
      setTokens({ accessToken: 'expired', refreshToken: 'revoked' });

      fetchMock
        .mockResolvedValueOnce(unauthorized())
        .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHENTICATED', message: 'revoked' } }))
        .mockResolvedValueOnce(unauthorized());

      const error = (await apiClient.get('/users').catch((e: unknown) => e)) as ApiError;
      expect(error.isUnauthenticated).toBe(true);
      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
    });

    it('does not try to refresh when there is no refresh token', async () => {
      fetchMock.mockResolvedValueOnce(unauthorized());

      await expect(apiClient.get('/users')).rejects.toBeInstanceOf(ApiError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  it('sends the bearer token when one is held', async () => {
    setTokens({ accessToken: 'abc', refreshToken: 'r' });
    fetchMock.mockResolvedValueOnce(ok({}));

    await apiClient.get('/auth/me');

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer abc');
  });

  it('sends no Authorization header when signed out', async () => {
    fetchMock.mockResolvedValueOnce(ok({}));

    await apiClient.get('/health');

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });
});
