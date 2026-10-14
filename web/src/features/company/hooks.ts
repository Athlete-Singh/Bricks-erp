'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateFinancialYearDto,
  CreateSiteDto,
  GrantSupportAccessDto,
  SwitchCompanyDto,
  UpdateCompanyDto,
} from '@brics/shared';
import { useAuthStore } from '@/stores/auth-store';
import * as authApi from '@/features/auth/api';
import * as api from './api';

export const companyKeys = {
  mine: ['company', 'mine'] as const,
  current: ['company', 'current'] as const,
  currentBilling: ['company', 'current', 'billing'] as const,
  sites: ['company', 'sites'] as const,
  financialYears: ['company', 'financial-years'] as const,
};

export function useMyCompanies(enabled = true) {
  return useQuery({
    queryKey: companyKeys.mine,
    queryFn: ({ signal }) => api.fetchMyCompanies(signal),
    enabled,
  });
}

export function useCurrentCompany() {
  return useQuery({
    queryKey: companyKeys.current,
    queryFn: ({ signal }) => api.fetchCurrentCompany(signal),
  });
}

export function useSites() {
  return useQuery({
    queryKey: companyKeys.sites,
    queryFn: ({ signal }) => api.fetchSites(signal),
  });
}

export function useFinancialYears() {
  return useQuery({
    queryKey: companyKeys.financialYears,
    queryFn: ({ signal }) => api.fetchFinancialYears(signal),
  });
}

/**
 * Switching company re-issues the whole session: the new company id is baked
 * into the JWT, so every cached query belongs to the previous tenant and must
 * be dropped rather than reused.
 */
export function useSwitchCompany() {
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: SwitchCompanyDto) => authApi.switchCompany(dto),
    onSuccess: (session) => {
      setSession(session);
      queryClient.clear();
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCompanyDto }) => api.updateCompany(id, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: companyKeys.current });
      void queryClient.invalidateQueries({ queryKey: companyKeys.mine });
    },
  });
}

export function useGrantSupportAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: GrantSupportAccessDto) => api.grantSupportAccess(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: companyKeys.current });
    },
  });
}

export function useRevokeSupportAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.revokeSupportAccess(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: companyKeys.current });
    },
  });
}

export function useCreateSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateSiteDto) => api.createSite(dto),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: companyKeys.sites }),
  });
}

export function useCreateFinancialYear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateFinancialYearDto) => api.createFinancialYear(dto),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: companyKeys.financialYears }),
  });
}

export function useActivateFinancialYear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.activateFinancialYear(id),
    // The backend deactivates the others in the same transaction, so refetch
    // the list rather than patching one row in the cache.
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: companyKeys.financialYears }),
  });
}

// ── tenant billing (S4 / PLT-11) ────────────────────────────────────────────

export function useCurrentTenantBilling() {
  return useQuery({
    queryKey: companyKeys.currentBilling,
    queryFn: ({ signal }) => api.fetchCurrentTenantBilling(signal),
  });
}
