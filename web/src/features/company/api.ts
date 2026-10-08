import type { CreateFinancialYearDto, CreateSiteDto, SiteType, UpdateCompanyDto } from '@brics/shared';
import { apiClient } from '@/lib/api-client';

export interface Company {
  id: string;
  name: string;
  gstin: string | null;
  pan: string | null;
  stateCode: string;
  address: string | null;
  logoUrl: string | null;
  isActive: boolean;
}

export interface Site {
  id: string;
  companyId: string;
  name: string;
  code: string;
  type: SiteType;
  address: string | null;
  isActive: boolean;
}

export interface FinancialYear {
  id: string;
  companyId: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isLocked: boolean;
}

// ── companies ────────────────────────────────────────────────────────────────

/** Companies the signed-in user belongs to — the source for the switcher. */
export function fetchMyCompanies(signal?: AbortSignal) {
  return apiClient.get<Company[]>('/companies', signal);
}

export function fetchCurrentCompany(signal?: AbortSignal) {
  return apiClient.get<Company>('/companies/current', signal);
}

export function updateCompany(id: string, dto: UpdateCompanyDto) {
  return apiClient.put<Company>(`/companies/${id}`, dto);
}

// ── kilns / sites ────────────────────────────────────────────────────────────

/** Kilns the signed-in user may work on, already scoped to the JWT tenant. */
export function fetchSites(signal?: AbortSignal) {
  return apiClient.get<Site[]>('/sites', signal);
}

export function createSite(dto: CreateSiteDto) {
  return apiClient.post<Site>('/sites', dto);
}

// ── financial years ──────────────────────────────────────────────────────────

export function fetchFinancialYears(signal?: AbortSignal) {
  return apiClient.get<FinancialYear[]>('/financial-years', signal);
}

export function createFinancialYear(dto: CreateFinancialYearDto) {
  return apiClient.post<FinancialYear>('/financial-years', dto);
}

export function activateFinancialYear(id: string) {
  return apiClient.patch<FinancialYear>(`/financial-years/${id}/activate`);
}
