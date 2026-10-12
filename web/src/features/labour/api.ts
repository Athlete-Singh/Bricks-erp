import { apiClient } from '@/lib/api-client';
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
  WageActivity,
  AttendanceStatus,
  DeductionCategory,
  SettlementStatus,
  PaymentMode,
} from '@brics/shared';

function query<T extends object>(params: T): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params) as [string, unknown][]) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

// ── GROUPS & WORKERS ──────────────────────────────────────────────────────────

export interface LabourGroup {
  id: string;
  companyId: string;
  siteId: string | null;
  sardarPartyId: string;
  name: string;
  activity: WageActivity;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  sardarParty?: {
    id: string;
    name: string;
    phone: string | null;
  };
  workers?: Worker[];
}

export interface Worker {
  id: string;
  companyId: string;
  labourGroupId: string;
  name: string;
  phone: string | null;
  dailyWageRate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  labourGroup?: {
    id: string;
    name: string;
    activity: WageActivity;
  };
}

export interface GroupListParams {
  siteId?: string;
  sardarPartyId?: string;
}

export interface WorkerListParams {
  labourGroupId?: string;
}

export const fetchLabourGroups = (params: GroupListParams = {}, signal?: AbortSignal) =>
  apiClient.get<LabourGroup[]>(`/labour/groups${query(params)}`, signal);

export const createLabourGroup = (dto: CreateLabourGroupInput) => apiClient.post<LabourGroup>('/labour/groups', dto);

export const updateLabourGroup = (id: string, dto: UpdateLabourGroupInput) =>
  apiClient.patch<LabourGroup>(`/labour/groups/${id}`, dto);

export const fetchWorkers = (params: WorkerListParams = {}, signal?: AbortSignal) =>
  apiClient.get<Worker[]>(`/labour/workers${query(params)}`, signal);

export const createWorker = (dto: CreateWorkerInput) => apiClient.post<Worker>('/labour/workers', dto);

export const updateWorker = (id: string, dto: UpdateWorkerInput) =>
  apiClient.patch<Worker>(`/labour/workers/${id}`, dto);

// ── ATTENDANCE ───────────────────────────────────────────────────────────────

export interface LabourAttendance {
  id: string;
  companyId: string;
  siteId: string;
  labourGroupId: string;
  workerId: string | null;
  date: string;
  status: AttendanceStatus;
  overtimeHours: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  worker?: {
    id: string;
    name: string;
    dailyWageRate: string | null;
  };
  labourGroup?: {
    id: string;
    name: string;
    activity: WageActivity;
  };
}

export const fetchAttendance = (params: AttendanceQueryDto = {}, signal?: AbortSignal) =>
  apiClient.get<LabourAttendance[]>(`/labour/attendance${query(params)}`, signal);

export const recordAttendance = (dto: CreateAttendanceInput) =>
  apiClient.post<LabourAttendance[]>('/labour/attendance', dto);

// ── ADVANCES & LEK-03 ────────────────────────────────────────────────────────

export interface LabourAdvance {
  id: string;
  companyId: string;
  siteId: string;
  sardarPartyId: string;
  workerId: string | null;
  date: string;
  amount: string;
  paymentMode: PaymentMode;
  cashBankLedgerId: string;
  voucherId: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  sardarParty?: {
    id: string;
    name: string;
    phone: string | null;
  };
  worker?: {
    id: string;
    name: string;
  };
}

export interface AdvanceExposureResult {
  sardarPartyId: string;
  sardarName: string;
  advancesDrawn: string;
  wagesEarned: string;
  deductionsTotal: string;
  netExposure: string;
  isExposed: boolean;
  warning: string | null;
}

export interface CreateAdvanceResult {
  advance: LabourAdvance;
  exposure: AdvanceExposureResult;
  warning: string | null;
}

export const fetchAdvances = (params: AdvanceQueryDto = {}, signal?: AbortSignal) =>
  apiClient.get<LabourAdvance[]>(`/labour/advances${query(params)}`, signal);

export const createAdvance = (dto: CreateAdvanceInput) => apiClient.post<CreateAdvanceResult>('/labour/advances', dto);

export const fetchAdvanceExposure = (sardarPartyId: string, signal?: AbortSignal) =>
  apiClient.get<AdvanceExposureResult>(`/labour/advances/exposure${query({ sardarPartyId })}`, signal);

export interface ExposureSummaryParams {
  siteId?: string;
  onlyExposed?: boolean | 'true' | 'false';
}

export const fetchExposureSummary = (params: ExposureSummaryParams = {}, signal?: AbortSignal) =>
  apiClient.get<AdvanceExposureResult[]>(`/labour/exposure-summary${query(params)}`, signal);

// ── DEDUCTIONS ───────────────────────────────────────────────────────────────

export interface LabourDeduction {
  id: string;
  companyId: string;
  siteId: string;
  sardarPartyId: string;
  workerId: string | null;
  date: string;
  category: DeductionCategory;
  amount: string;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  sardarParty?: {
    id: string;
    name: string;
    phone: string | null;
  };
  worker?: {
    id: string;
    name: string;
  };
}

export const fetchDeductions = (params: DeductionQueryDto = {}, signal?: AbortSignal) =>
  apiClient.get<LabourDeduction[]>(`/labour/deductions${query(params)}`, signal);

export const createDeduction = (dto: CreateDeductionInput) =>
  apiClient.post<LabourDeduction>('/labour/deductions', dto);

// ── AUTO WAGE ACCRUAL (LAB-04) ───────────────────────────────────────────────

export interface AccrueWagesResult {
  voucherId: string;
  voucherNumber: string;
  grossWages: string;
  narration: string;
}

export const accrueWages = (dto: AccrueWagesInput) => apiClient.post<AccrueWagesResult>('/labour/accrue-wages', dto);

// ── SETTLEMENTS (LAB-07) ─────────────────────────────────────────────────────

export interface LabourSettlement {
  id: string;
  companyId: string;
  siteId: string;
  fyId: string;
  sardarPartyId: string;
  periodFrom: string;
  periodTo: string;
  grossWages: string;
  advancesRecovered: string;
  deductions: string;
  netPayable: string;
  status: SettlementStatus;
  voucherId: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  sardarParty?: {
    id: string;
    name: string;
    phone: string | null;
  };
}

export const fetchSettlements = (params: SettlementQueryDto = {}, signal?: AbortSignal) =>
  apiClient.get<LabourSettlement[]>(`/labour/settlements${query(params)}`, signal);

export const fetchSettlement = (id: string, signal?: AbortSignal) =>
  apiClient.get<LabourSettlement>(`/labour/settlements/${id}`, signal);

export const createSettlement = (dto: CreateSettlementInput) =>
  apiClient.post<LabourSettlement>('/labour/settlements', dto);
