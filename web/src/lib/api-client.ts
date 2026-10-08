import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './auth-token';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

/** One field-level complaint from the backend's Zod pipe. */
export interface ValidationIssue {
  field: string;
  message: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
}

/** The backend envelope: `{ data }`, or `{ data, meta }` on paginated lists. */
interface Envelope<T> {
  data: T;
  meta?: PageMeta;
}

interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
}

/** Thrown for every non-2xx response, carrying the backend's error contract. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: ValidationIssue[],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isUnauthenticated(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  /** Field errors from a 400, keyed by field name, for React Hook Form. */
  get fieldErrors(): Record<string, string> {
    if (!this.details) return {};
    return Object.fromEntries(this.details.map((d) => [d.field, d.message]));
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: Method;
  body?: unknown;
  signal?: AbortSignal;
  /** Skip the 401 → refresh → retry dance (used by the refresh call itself). */
  skipAuthRetry?: boolean;
}

// ── refresh, single-flight ───────────────────────────────────────────────────
// Several queries can 401 at once when the access token expires. Without this,
// each would refresh separately and — because refresh tokens rotate (ADR-015) —
// all but the first would present an already-revoked token and log the user out.
let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const tokens = await rawRequest<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      skipAuthRetry: true,
    });
    setTokens(tokens);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

function refreshOnce(): Promise<boolean> {
  refreshInFlight ??= refreshAccessToken().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

// ── core ─────────────────────────────────────────────────────────────────────

async function rawRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const envelope = await requestEnvelope<T>(path, options);
  return envelope.data;
}

async function requestEnvelope<T>(path: string, options: RequestOptions = {}): Promise<Envelope<T>> {
  const { method = 'GET', body, signal, skipAuthRetry } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (res.status === 401 && !skipAuthRetry) {
    if (await refreshOnce()) {
      return requestEnvelope<T>(path, { ...options, skipAuthRetry: true });
    }
  }

  if (!res.ok) throw await toApiError(res);

  if (res.status === 204) return { data: undefined as T };
  return (await res.json()) as Envelope<T>;
}

async function toApiError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
  const details = Array.isArray(body.error?.details) ? (body.error.details as ValidationIssue[]) : undefined;
  return new ApiError(
    res.status,
    body.error?.code ?? 'UNKNOWN',
    body.error?.message ?? res.statusText ?? 'Request failed',
    details,
  );
}

/**
 * Returns the `data` payload, not the envelope (ADR-017). Use `getPaged` where
 * the endpoint also returns `meta`.
 */
export const apiClient = {
  get: <T>(path: string, signal?: AbortSignal) => rawRequest<T>(path, { signal }),
  getPaged: async <T>(path: string, signal?: AbortSignal): Promise<{ items: T[]; meta: PageMeta }> => {
    const envelope = await requestEnvelope<T[]>(path, { signal });
    return {
      items: envelope.data,
      meta: envelope.meta ?? { page: 1, limit: envelope.data.length, total: envelope.data.length },
    };
  },
  post: <T>(path: string, body?: unknown) => rawRequest<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => rawRequest<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => rawRequest<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => rawRequest<T>(path, { method: 'DELETE' }),
};
