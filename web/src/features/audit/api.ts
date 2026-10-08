import type { AuditAction, AuditLogQueryDto } from '@brics/shared';
import { apiClient, type PageMeta } from '@/lib/api-client';

export interface AuditEntry {
  id: string;
  companyId: string | null;
  userId: string | null;
  entityName: string;
  entityId: string | null;
  action: AuditAction;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export type AuditFilters = Partial<AuditLogQueryDto>;

function toQueryString(filters: AuditFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    // Blank filter fields must not be sent: the backend validates `.min(1)` on
    // the optional ones, so an empty string is a 400, not "no filter".
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  return params.toString();
}

export function fetchAuditLogs(
  filters: AuditFilters,
  signal?: AbortSignal,
): Promise<{ items: AuditEntry[]; meta: PageMeta }> {
  const query = toQueryString(filters);
  return apiClient.getPaged<AuditEntry>(`/audit-logs${query ? `?${query}` : ''}`, signal);
}
