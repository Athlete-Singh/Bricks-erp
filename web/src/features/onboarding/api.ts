import { apiClient } from '@/lib/api-client';
import type { OnboardingKind, OnboardingRowResult } from '@brics/shared';

export interface OnboardingReport {
  kind: OnboardingKind;
  rows: OnboardingRowResult[];
  okCount: number;
  problemCount: number;
  imported: boolean;
}

export interface OnboardingReference {
  units: string[];
  warehouses: string[];
  ledgers: string[];
  items: string[];
  brickGrades: string[];
  hsnCodes: string[];
}

export const fetchOnboardingReference = (signal?: AbortSignal) =>
  apiClient.get<OnboardingReference>('/onboarding/reference', signal);

export const previewImport = (kind: OnboardingKind, rows: Record<string, string>[]) =>
  apiClient.post<OnboardingReport>('/onboarding/preview', { kind, rows });

export const commitImport = (kind: OnboardingKind, rows: Record<string, string>[]) =>
  apiClient.post<OnboardingReport>('/onboarding/commit', { kind, rows });
