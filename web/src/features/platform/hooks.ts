'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateSupportSessionDto, CreateTenantDto, SuspendTenantDto } from '@brics/shared';
import { useSession } from '@/features/auth/use-auth';
import * as api from './api';

export const platformKeys = {
  tenants: ['platform', 'tenants'] as const,
  tenant: (id: string) => ['platform', 'tenant', id] as const,
  supportSessions: ['platform', 'support-sessions'] as const,
  mySupportSessions: (tenantId?: string) => ['platform', 'support-sessions', 'mine', tenantId ?? 'all'] as const,
  tenantSupportSessions: (tenantId: string) => ['platform', 'support-sessions', 'tenant', tenantId] as const,
};

export function useTenants() {
  return useQuery({
    queryKey: platformKeys.tenants,
    queryFn: ({ signal }) => api.fetchTenants(signal),
  });
}

export function useTenant(id: string | undefined) {
  return useQuery({
    queryKey: id ? platformKeys.tenant(id) : ['platform', 'tenant', 'none'],
    queryFn: ({ signal }) => api.fetchTenant(id as string, signal),
    enabled: Boolean(id),
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateTenantDto) => api.createTenant(dto),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: platformKeys.tenants }),
  });
}

export function useSuspendTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: SuspendTenantDto }) => api.suspendTenant(id, dto),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: platformKeys.tenants });
      void queryClient.invalidateQueries({ queryKey: platformKeys.tenant(id) });
    },
  });
}

export function useReactivateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.reactivateTenant(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: platformKeys.tenants });
      void queryClient.invalidateQueries({ queryKey: platformKeys.tenant(id) });
    },
  });
}

// ── Support sessions (PLT-07) ────────────────────────────────────────────────

export function useOpenSupportSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateSupportSessionDto) => api.openSupportSession(dto),
    onSuccess: (_data, dto) => {
      void queryClient.invalidateQueries({ queryKey: platformKeys.supportSessions });
      void queryClient.invalidateQueries({ queryKey: platformKeys.tenantSupportSessions(dto.tenantId) });
    },
  });
}

export function useCloseSupportSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.closeSupportSession(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: platformKeys.supportSessions });
    },
  });
}

export function useMySupportSessions(tenantId?: string) {
  return useQuery({
    queryKey: platformKeys.mySupportSessions(tenantId),
    queryFn: ({ signal }) => api.fetchMySupportSessions(tenantId, signal),
  });
}

export function useTenantSupportSessions(tenantId: string | undefined) {
  return useQuery({
    queryKey: tenantId
      ? platformKeys.tenantSupportSessions(tenantId)
      : ['platform', 'support-sessions', 'tenant', 'none'],
    queryFn: ({ signal }) => api.fetchTenantSupportSessions(tenantId as string, signal),
    enabled: Boolean(tenantId),
  });
}

/**
 * Reads the signed-in user id and companyId from session and finds the active open
 * session via fetchMySupportSessions. The one open session for the current tenant is what we show.
 */
export function useActiveSupportSessionForMe() {
  const { user, company } = useSession();
  const isPlatformSupport = user?.roleCode === 'platform_support';
  const query = useQuery({
    queryKey: platformKeys.mySupportSessions(company?.id),
    queryFn: ({ signal }) => api.fetchMySupportSessions(company?.id, signal),
    enabled: isPlatformSupport && Boolean(company?.id),
    refetchInterval: 10_000,
  });

  const activeSession =
    query.data?.find((s) => {
      if (s.closedAt) return false;
      const expiresAtMs = new Date(s.expiresAt).getTime();
      return expiresAtMs > Date.now() && (!company?.id || s.tenantId === company.id);
    }) ?? null;

  return {
    ...query,
    activeSession,
    session: activeSession,
  };
}
