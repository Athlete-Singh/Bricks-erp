'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateLabourGroupInput,
  UpdateLabourGroupInput,
  CreateWorkerInput,
  UpdateWorkerInput,
  CreateAttendanceInput,
  AttendanceQueryDto,
  CreateAdvanceInput,
  AdvanceQueryDto,
  CreateDeductionInput,
  DeductionQueryDto,
  CreateSettlementInput,
  SettlementQueryDto,
  AccrueWagesInput,
} from '@brics/shared';
import * as api from './api';

export const labourKeys = {
  all: ['labour'] as const,
  groups: (params: api.GroupListParams = {}) => ['labour', 'groups', params] as const,
  workers: (params: api.WorkerListParams = {}) => ['labour', 'workers', params] as const,
  attendance: (params: AttendanceQueryDto = {}) => ['labour', 'attendance', params] as const,
  advances: (params: AdvanceQueryDto = {}) => ['labour', 'advances', params] as const,
  exposure: (sardarPartyId: string) => ['labour', 'exposure', sardarPartyId] as const,
  exposureSummary: (params: api.ExposureSummaryParams = {}) => ['labour', 'exposure-summary', params] as const,
  deductions: (params: DeductionQueryDto = {}) => ['labour', 'deductions', params] as const,
  settlements: (params: SettlementQueryDto = {}) => ['labour', 'settlements', params] as const,
  settlement: (id: string) => ['labour', 'settlements', id] as const,
};

// ── GROUPS & WORKERS ──────────────────────────────────────────────────────────

export function useLabourGroups(params: api.GroupListParams = {}) {
  return useQuery({
    queryKey: labourKeys.groups(params),
    queryFn: ({ signal }) => api.fetchLabourGroups(params, signal),
  });
}

export function useCreateLabourGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateLabourGroupInput) => api.createLabourGroup(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: labourKeys.all });
    },
  });
}

export function useUpdateLabourGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateLabourGroupInput }) => api.updateLabourGroup(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: labourKeys.all });
    },
  });
}

export function useWorkers(params: api.WorkerListParams = {}) {
  return useQuery({
    queryKey: labourKeys.workers(params),
    queryFn: ({ signal }) => api.fetchWorkers(params, signal),
  });
}

export function useCreateWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateWorkerInput) => api.createWorker(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: labourKeys.all });
    },
  });
}

export function useUpdateWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateWorkerInput }) => api.updateWorker(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: labourKeys.all });
    },
  });
}

// ── ATTENDANCE ───────────────────────────────────────────────────────────────

export function useAttendance(params: AttendanceQueryDto = {}) {
  return useQuery({
    queryKey: labourKeys.attendance(params),
    queryFn: ({ signal }) => api.fetchAttendance(params, signal),
  });
}

export function useRecordAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateAttendanceInput) => api.recordAttendance(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: labourKeys.all });
    },
  });
}

// ── ADVANCES & LEK-03 ────────────────────────────────────────────────────────

export function useAdvances(params: AdvanceQueryDto = {}) {
  return useQuery({
    queryKey: labourKeys.advances(params),
    queryFn: ({ signal }) => api.fetchAdvances(params, signal),
  });
}

export function useCreateAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateAdvanceInput) => api.createAdvance(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: labourKeys.all });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['vouchers'] });
    },
  });
}

export function useSardarExposure(sardarPartyId: string | null | undefined) {
  return useQuery({
    queryKey: labourKeys.exposure(sardarPartyId ?? ''),
    queryFn: ({ signal }) => api.fetchAdvanceExposure(sardarPartyId!, signal),
    enabled: Boolean(sardarPartyId),
  });
}

export function useExposureSummary(params: api.ExposureSummaryParams = {}) {
  return useQuery({
    queryKey: labourKeys.exposureSummary(params),
    queryFn: ({ signal }) => api.fetchExposureSummary(params, signal),
  });
}

// ── DEDUCTIONS ───────────────────────────────────────────────────────────────

export function useDeductions(params: DeductionQueryDto = {}) {
  return useQuery({
    queryKey: labourKeys.deductions(params),
    queryFn: ({ signal }) => api.fetchDeductions(params, signal),
  });
}

export function useCreateDeduction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateDeductionInput) => api.createDeduction(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: labourKeys.all });
    },
  });
}

// ── AUTO WAGE ACCRUAL (LAB-04) ───────────────────────────────────────────────

export function useAccrueWages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: AccrueWagesInput) => api.accrueWages(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: labourKeys.all });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['vouchers'] });
    },
  });
}

// ── SETTLEMENTS (LAB-07) ─────────────────────────────────────────────────────

export function useSettlements(params: SettlementQueryDto = {}) {
  return useQuery({
    queryKey: labourKeys.settlements(params),
    queryFn: ({ signal }) => api.fetchSettlements(params, signal),
  });
}

export function useSettlement(id: string | null | undefined) {
  return useQuery({
    queryKey: labourKeys.settlement(id ?? ''),
    queryFn: ({ signal }) => api.fetchSettlement(id!, signal),
    enabled: Boolean(id),
  });
}

export function useCreateSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateSettlementInput) => api.createSettlement(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: labourKeys.all });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['vouchers'] });
    },
  });
}
