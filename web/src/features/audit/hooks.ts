'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import * as api from './api';
import type { AuditFilters } from './api';

export const auditKeys = {
  list: (filters: AuditFilters) => ['audit', 'list', filters] as const,
};

export function useAuditLogs(filters: AuditFilters) {
  return useQuery({
    queryKey: auditKeys.list(filters),
    queryFn: ({ signal }) => api.fetchAuditLogs(filters, signal),
    // Keeps the previous page on screen while the next one loads, so paging
    // does not blank the table on every click.
    placeholderData: keepPreviousData,
  });
}
