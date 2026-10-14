import type {
  AuthResponseDto,
  CreatePlatformInvoiceDto,
  CreateSupportSessionDto,
  CreateTenantDto,
  ExpiryCheckResultDto,
  PlatformInvoiceDto,
  PlatformPlan,
  RecordPlatformPaymentDto,
  SupportSessionDto,
  SuspendTenantDto,
  TenantBillingInfoDto,
  TenantDetailDto,
  TenantSummaryDto,
  UpdateTenantSettingsDto,
  UpdateTenantSubscriptionDto,
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
  return apiClient.get<TenantDetailDto>(`/platform/tenants/${id}`, signal);
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

export function updateTenantSettings(id: string, dto: UpdateTenantSettingsDto) {
  return apiClient.patch<TenantSummaryDto>(`/platform/tenants/${id}/settings`, dto);
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

// ── Platform Billing (S4 / PLT-11) ──────────────────────────────────────────

export function fetchPlatformPlans(signal?: AbortSignal) {
  return apiClient.get<PlatformPlan[]>('/platform/plans', signal);
}

export function fetchTenantBilling(tenantId: string, signal?: AbortSignal) {
  return apiClient.get<TenantBillingInfoDto>(`/platform/tenants/${tenantId}/billing`, signal);
}

export function updateTenantSubscription(tenantId: string, dto: UpdateTenantSubscriptionDto) {
  return apiClient.patch<TenantBillingInfoDto>(`/platform/tenants/${tenantId}/subscription`, dto);
}

export function createPlatformInvoice(tenantId: string, dto: CreatePlatformInvoiceDto) {
  return apiClient.post<PlatformInvoiceDto>(`/platform/tenants/${tenantId}/invoices`, dto);
}

export function recordPlatformPayment(invoiceId: string, dto: RecordPlatformPaymentDto) {
  return apiClient.post<PlatformInvoiceDto>(`/platform/invoices/${invoiceId}/record-payment`, dto);
}

export function runBillingExpiryCheck() {
  return apiClient.post<ExpiryCheckResultDto>('/platform/billing/check-expiry');
}
