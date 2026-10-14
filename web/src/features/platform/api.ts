import type { CreateTenantDto, SuspendTenantDto, TenantSummaryDto } from '@brics/shared';
import { apiClient } from '@/lib/api-client';

/**
 * What `POST /platform/tenants` returns — the SaaS onboarding call hands back a
 * digest of what it just made rather than one of the three rows. The web
 * confirms with the owner's mobile and the FY label, both derived server-side.
 */
export interface OnboardTenantResult {
  tenant: { id: string; name: string; status: TenantSummaryDto['status'] };
  owner: { id: string; mobile: string; email: string | null; name: string };
  financialYear: { id: string; name: string };
}

export function fetchTenants(signal?: AbortSignal) {
  return apiClient.get<TenantSummaryDto[]>('/platform/tenants', signal);
}

export function fetchTenant(id: string, signal?: AbortSignal) {
  return apiClient.get<TenantSummaryDto>(`/platform/tenants/${id}`, signal);
}

export function createTenant(dto: CreateTenantDto) {
  return apiClient.post<OnboardTenantResult>('/platform/tenants', dto);
}

export function suspendTenant(id: string, dto: SuspendTenantDto) {
  return apiClient.post<TenantSummaryDto>(`/platform/tenants/${id}/suspend`, dto);
}

export function reactivateTenant(id: string) {
  return apiClient.post<TenantSummaryDto>(`/platform/tenants/${id}/reactivate`);
}
