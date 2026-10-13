'use client';

import { useQuery } from '@tanstack/react-query';
import type { CostPerThousandQueryDto, DashboardMonthlyQueryDto, DashboardSummaryQueryDto } from '@brics/shared';
import * as api from './api';

export const dashboardKeys = {
  summary: (p: DashboardSummaryQueryDto) => ['dashboard', 'summary', p] as const,
  monthly: (p: DashboardMonthlyQueryDto) => ['dashboard', 'monthly', p] as const,
  cost: (p: CostPerThousandQueryDto) => ['dashboard', 'cost', p] as const,
};

export const useDashboardSummary = (params: DashboardSummaryQueryDto = {}) =>
  useQuery({
    queryKey: dashboardKeys.summary(params),
    queryFn: ({ signal }) => api.fetchDashboardSummary(params, signal),
  });

export const useDashboardMonthly = (params: DashboardMonthlyQueryDto = {}) =>
  useQuery({
    queryKey: dashboardKeys.monthly(params),
    queryFn: ({ signal }) => api.fetchDashboardMonthly(params, signal),
  });

export const useCostPerThousand = (params: CostPerThousandQueryDto) =>
  useQuery({
    queryKey: dashboardKeys.cost(params),
    queryFn: ({ signal }) => api.fetchCostPerThousand(params, signal),
    enabled: Boolean(params.fromDate && params.toDate),
  });

export const useDailyReport = (params: { date: string; siteId?: string }) =>
  useQuery({
    queryKey: ['dashboard', 'daily', params],
    queryFn: ({ signal }) => api.fetchDailyReport(params, signal),
    enabled: Boolean(params.date),
  });

export const useSalesRegister = (params: Parameters<typeof api.fetchSalesRegister>[0]) =>
  useQuery({
    queryKey: ['dashboard', 'sales-register', params],
    queryFn: ({ signal }) => api.fetchSalesRegister(params, signal),
    enabled: Boolean(params.fromDate && params.toDate),
  });

export const useAttendanceRegister = (params: Parameters<typeof api.fetchAttendanceRegister>[0]) =>
  useQuery({
    queryKey: ['dashboard', 'attendance', params],
    queryFn: ({ signal }) => api.fetchAttendanceRegister(params, signal),
    enabled: Boolean(params.fromDate && params.toDate),
  });

export const useWageRegister = (params: Parameters<typeof api.fetchWageRegister>[0]) =>
  useQuery({
    queryKey: ['dashboard', 'wages', params],
    queryFn: ({ signal }) => api.fetchWageRegister(params, signal),
    enabled: Boolean(params.fromDate && params.toDate),
  });
