import { apiClient } from '@/lib/api-client';
import type { CostPerThousandQueryDto, DashboardMonthlyQueryDto, DashboardSummaryQueryDto } from '@brics/shared';

function query<T extends object>(params: T): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params) as [string, unknown][]) {
    if (v === undefined || v === null || v === '') continue;
    search.set(k, String(v));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

// ── DSH-01 summary ──────────────────────────────────────────────────────────

export interface DashboardWindow {
  firstOfMonth: string;
  lastOfMonth: string;
  firstOfYear: string;
}

export interface DashboardSummary {
  asOf: string;
  window: DashboardWindow;
  siteId: string | null;
  production: {
    firedToday: string;
    firedMtd: string;
    firedYtd: string;
    sortedToday: string;
    sortedMtd: string;
    sortedYtd: string;
  };
  stock: { bricksProduced: string; itemsOnHand: string; itemCount: number };
  sold: { mtd: string; ytd: string; collectionMtd: string; collectionYtd: string };
  dispatched: { mtd: string; ytd: string };
  receivables: string;
  payables: string;
  labourPayable: string;
  expenses: { mtd: string; ytd: string };
  coalCostMtd: string;
  dieselCostMtd: string;
  estimatedProfitMtd: string;
  costPerThousandMtd: string | null;
  costPerThousandBenchmark: string;
  grossMarginPercentMtd: string | null;
}

export const fetchDashboardSummary = (params: DashboardSummaryQueryDto, signal?: AbortSignal) =>
  apiClient.getWithMeta<never, DashboardSummary>(`/dashboard/summary${query(params)}`, signal);

// ── DSH-02 monthly ──────────────────────────────────────────────────────────

export interface MonthlyPoint {
  month: string;
  productionFired: string;
  salesInvoiced: string;
  collection: string;
  dispatched: string;
  expenses: string;
  coalCost: string;
  dieselCost: string;
}

export interface MonthlyMeta {
  fromMonth: string;
  toMonth: string;
  monthCount: number;
  siteId: string | null;
}

export const fetchDashboardMonthly = (params: DashboardMonthlyQueryDto, signal?: AbortSignal) =>
  apiClient.getWithMeta<MonthlyPoint, MonthlyMeta>(`/dashboard/monthly${query(params)}`, signal);

// ── CST-01 ──────────────────────────────────────────────────────────────────

export interface CostRow {
  siteId: string;
  month: string;
  brickTypeId: string;
  brickTypeGrade: string;
  firedBricks: string;
  shareOfKilnMonth: string;
  buckets: {
    labour: string;
    coal: string;
    soil: string;
    electricity: string;
    loading: string;
    repairs: string;
    other: string;
  };
  totalCost: string;
  costPerThousand: string | null;
  /** Bricks invoiced out of this kiln in the month, net of returns. */
  soldBricks: string;
  /** Realised per 1,000 for the kiln-month — null when the month sold nothing. */
  sellingPricePerThousand: string | null;
  grossMarginPercent: string | null;
  benchmark: string;
  deltaVsBenchmark: string | null;
  overBenchmark: boolean | null;
}

export interface CostMeta {
  fromDate: string;
  toDate: string;
  siteId: string | null;
  brickTypeId: string | null;
  rowCount: number;
  benchmark: string;
  /**
   * Which level the realised price describes. Per grade since ADR-051 tied a
   * grade to the item it sells as; the screen reads the label from here rather
   * than hardcoding the claim.
   */
  realisationLevel: 'brick-type' | 'kiln-month';
}

export const fetchCostPerThousand = (params: CostPerThousandQueryDto, signal?: AbortSignal) =>
  apiClient.getWithMeta<CostRow, CostMeta>(`/reports/cost-per-1000${query(params)}`, signal);

// ── RPT-02 Daily report ────────────────────────────────────────────────────

export interface DailyReport {
  date: string;
  siteId: string | null;
  production: { fired: string; sorted: string };
  dispatch: { bricks: string; challans: number };
  sales: { invoiced: string; invoices: number };
  collection: string;
  expenses: string;
  coalCost: string;
  dieselCost: string;
  /** What was issued to production that day, in each item's own unit. */
  consumption: { itemId: string; itemName: string; unit: string; quantity: string }[];
  labourPresent: number;
}

export const fetchDailyReport = (params: { date: string; siteId?: string }, signal?: AbortSignal) =>
  apiClient.getWithMeta<never, DailyReport>(`/reports/daily${query(params)}`, signal);

// ── RPT-03 Sales register ───────────────────────────────────────────────────

export interface SalesRegisterRow {
  invoiceId: string;
  invoiceNo: string;
  invoiceDate: string;
  customerId: string;
  customerName: string;
  itemId: string;
  itemName: string;
  hsnCode: string | null;
  quantity: string;
  rate: string;
  discount: string;
  taxableAmount: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  lineTotal: string;
}

export interface SalesRegisterMeta {
  fromDate: string;
  toDate: string;
  rowCount: number;
  taxableAmount: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  total: string;
}

export const fetchSalesRegister = (
  params: { fromDate: string; toDate: string; customerId?: string; itemId?: string; siteId?: string },
  signal?: AbortSignal,
) => apiClient.getWithMeta<SalesRegisterRow, SalesRegisterMeta>(`/reports/sales-register${query(params)}`, signal);

// ── RPT-04 Labour register ──────────────────────────────────────────────────

export interface AttendanceRow {
  id: string;
  date: string;
  groupId: string;
  groupName: string | null;
  sardarId: string | null;
  sardarName: string | null;
  workerId: string | null;
  workerName: string | null;
  status: string;
  overtimeHours: string;
}

export interface WageAccrualRow {
  accrualId: string;
  periodFrom: string;
  periodTo: string;
  sardarId: string;
  sardarName: string;
  grossWages: string;
}

export interface AttendanceMeta {
  kind: 'attendance';
  fromDate: string;
  toDate: string;
  rowCount: number;
  presentDays: number;
  halfDays: number;
  absentDays: number;
}

export interface WagesMeta {
  kind: 'wages';
  fromDate: string;
  toDate: string;
  rowCount: number;
  totalGrossWages: string;
}

export const fetchAttendanceRegister = (
  params: { fromDate: string; toDate: string; sardarId?: string; groupId?: string; siteId?: string },
  signal?: AbortSignal,
) =>
  apiClient.getWithMeta<AttendanceRow, AttendanceMeta>(
    `/reports/labour-register${query({ ...params, kind: 'attendance' })}`,
    signal,
  );

export const fetchWageRegister = (
  params: { fromDate: string; toDate: string; sardarId?: string; siteId?: string },
  signal?: AbortSignal,
) =>
  apiClient.getWithMeta<WageAccrualRow, WagesMeta>(
    `/reports/labour-register${query({ ...params, kind: 'wages' })}`,
    signal,
  );
