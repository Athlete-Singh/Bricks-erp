import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role } from './api';
import { useRoles } from './hooks';

const fetchRolesMock = vi.fn();
vi.mock('./api', () => ({ fetchRoles: () => fetchRolesMock() }));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const SEEDED: Role[] = [
  { id: '1', code: 'owner', name: 'Owner', description: null, isSystemRole: true },
  { id: '2', code: 'accountant', name: 'Accountant', description: null, isSystemRole: true },
  { id: '3', code: 'platform_admin', name: 'Platform Admin', description: null, isSystemRole: true },
];

describe('useRoles', () => {
  beforeEach(() => vi.clearAllMocks());

  it('filters out platform_admin so the owner never sees a role they cannot usefully assign (S1.2)', async () => {
    fetchRolesMock.mockResolvedValue(SEEDED);
    const { result } = renderHook(() => useRoles(), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());
    const codes = result.current.data!.map((r) => r.code);
    expect(codes).toEqual(['owner', 'accountant']);
    expect(codes).not.toContain('platform_admin');
  });
});
