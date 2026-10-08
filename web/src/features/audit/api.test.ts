import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAuditLogs } from './api';

const BASE = 'http://localhost:4000/api/v1';

function paged(items: unknown[], meta: unknown): Response {
  return new Response(JSON.stringify({ data: items, meta }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('fetchAuditLogs', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(paged([], { page: 1, limit: 25, total: 0 }));
    vi.stubGlobal('fetch', fetchMock);
    localStorage.clear();
  });

  afterEach(() => vi.unstubAllGlobals());

  const urlOf = () => String(fetchMock.mock.calls[0]?.[0]);

  it('sends no query string when there are no filters', async () => {
    await fetchAuditLogs({});
    expect(urlOf()).toBe(`${BASE}/audit-logs`);
  });

  it('drops blank filter fields instead of sending empty strings', async () => {
    // The backend validates `.min(1)` on the optional filters, so an empty
    // string is a 400 rather than "no filter".
    await fetchAuditLogs({ page: 2, action: '', entityName: undefined, userId: '' });

    const url = new URL(urlOf());
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.has('action')).toBe(false);
    expect(url.searchParams.has('entityName')).toBe(false);
    expect(url.searchParams.has('userId')).toBe(false);
  });

  it('passes the filters the backend understands', async () => {
    await fetchAuditLogs({
      page: 3,
      limit: 50,
      action: 'LOGIN',
      entityName: 'users',
      userId: '11111111-1111-1111-1111-111111111111',
      from: '2026-04-01',
      to: '2026-04-30',
    });

    const url = new URL(urlOf());
    expect(Object.fromEntries(url.searchParams)).toEqual({
      page: '3',
      limit: '50',
      action: 'LOGIN',
      entityName: 'users',
      userId: '11111111-1111-1111-1111-111111111111',
      from: '2026-04-01',
      to: '2026-04-30',
    });
  });

  it('returns the rows together with the paging meta', async () => {
    fetchMock.mockResolvedValue(paged([{ id: 'a1', action: 'LOGIN' }], { page: 2, limit: 25, total: 60 }));

    const result = await fetchAuditLogs({ page: 2 });

    expect(result.items).toHaveLength(1);
    expect(result.meta).toEqual({ page: 2, limit: 25, total: 60 });
  });
});
