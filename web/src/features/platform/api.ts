import type {
  AuthResponseDto,
  CreateSupportSessionDto,
  CreateTenantDto,
  SupportSessionDto,
  SuspendTenantDto,
  TenantSummaryDto,
} from '@brics/shared';
import { apiClient } from '@/lib/api-client';
import { restorePlatformTokens } from '@/lib/support-token-store';

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

export interface SupportSessionOpenResult {
  session: SupportSessionDto;
  auth: AuthResponseDto;
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

// ── Support sessions (PLT-07) ────────────────────────────────────────────────

export function openSupportSession(dto: CreateSupportSessionDto) {
  return apiClient.post<SupportSessionOpenResult>('/platform/support-sessions', dto);
}

export function closeSupportSession(id: string) {
  const platformToken = restorePlatformTokens()?.accessToken;
  return apiClient.post<SupportSessionDto>(`/platform/support-sessions/${id}/close`, undefined, platformToken);
}

export function fetchMySupportSessions(tenantId?: string, signal?: AbortSignal) {
  const path = tenantId
    ? `/platform/support-sessions?tenantId=${encodeURIComponent(tenantId)}`
    : '/platform/support-sessions';
  const platformToken = restorePlatformTokens()?.accessToken;
  return apiClient.get<SupportSessionDto[]>(path, signal, platformToken);
}

export function fetchTenantSupportSessions(tenantId: string, signal?: AbortSignal) {
  const platformToken = restorePlatformTokens()?.accessToken;
  return apiClient.get<SupportSessionDto[]>(`/platform/support-sessions/for-tenant/${tenantId}`, signal, platformToken);
}
