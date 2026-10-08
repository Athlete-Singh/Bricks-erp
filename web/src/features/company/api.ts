import type { SiteType } from '@brics/shared';
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

/** Companies the signed-in user belongs to — the source for the switcher. */
export function fetchMyCompanies(signal?: AbortSignal) {
  return apiClient.get<Company[]>('/companies', signal);
}

export function fetchCurrentCompany(signal?: AbortSignal) {
  return apiClient.get<Company>('/companies/current', signal);
}

/** Kilns the signed-in user may work on, already scoped to the JWT tenant. */
export function fetchSites(signal?: AbortSignal) {
  return apiClient.get<Site[]>('/sites', signal);
}
