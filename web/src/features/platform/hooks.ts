'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateTenantDto, SuspendTenantDto } from '@brics/shared';
import * as api from './api';

export const platformKeys = {
  tenants: ['platform', 'tenants'] as const,
  tenant: (id: string) => ['platform', 'tenant', id] as const,
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
