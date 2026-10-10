import { apiClient } from '@/lib/api-client';
import type {
  ProductionBatchCreateInput,
  ProductionBatchStatus,
  ProductionDryingInput,
  ProductionFiringInput,
  ProductionMakingInput,
  ProductionSortingInput,
  ProductionStage,
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

export interface ProductionBatch {
  id: string;
  siteId: string;
  chamber: string;
  batchDate: string;
  status: ProductionBatchStatus;
  notes: string | null;
}

export interface ProductionEntry {
  id: string;
  batchId: string;
  stage: ProductionStage;
  entryDate: string;
  greenBricks: string;
  firedBricks: string;
  brokenBricks: string;
  rejectBricks: string;
  sardarPartyId: string | null;
  warehouseId: string | null;
  notes: string | null;
}

export interface SortingOutput {
  id: string;
  entryId: string;
  brickTypeId: string;
  quantity: string;
}

export interface ProductionConsumption {
  id: string;
  entryId: string;
  itemId: string;
  warehouseId: string;
  quantity: string;
}

export interface BatchDetail {
  batch: ProductionBatch;
  entries: ProductionEntry[];
  outputs: SortingOutput[];
  consumptions: ProductionConsumption[];
}

export interface BatchListParams {
  page?: number;
  limit?: number;
  siteId?: string;
  chamber?: string;
  status?: string;
  from?: string;
  to?: string;
}

export const fetchBatches = (params: BatchListParams = {}, signal?: AbortSignal) =>
  apiClient.getPaged<ProductionBatch>(`/production/batches${query(params)}`, signal);

export const fetchBatch = (id: string, signal?: AbortSignal) =>
  apiClient.get<BatchDetail>(`/production/batches/${id}`, signal);

export const createBatch = (dto: ProductionBatchCreateInput) =>
  apiClient.post<ProductionBatch>('/production/batches', dto);

/**
 * The four stage endpoints. Each is a POST that may be made **once** per batch
 * — a posted stage is corrected by reversal, never edited — so the UI has to
 * treat a recorded stage as closed rather than offering a re-save.
 */
export const recordMaking = (batchId: string, dto: ProductionMakingInput) =>
  apiClient.post<unknown>(`/production/batches/${batchId}/making`, dto);

export const recordDrying = (batchId: string, dto: ProductionDryingInput) =>
  apiClient.post<unknown>(`/production/batches/${batchId}/drying`, dto);

export const recordFiring = (batchId: string, dto: ProductionFiringInput) =>
  apiClient.post<unknown>(`/production/batches/${batchId}/firing`, dto);

export const recordSorting = (batchId: string, dto: ProductionSortingInput) =>
  apiClient.post<unknown>(`/production/batches/${batchId}/sorting`, dto);

// ── reports ───────────────────────────────────────────────────────────────────

export interface YieldVarianceRow {
  groupId: string;
  groupLabel: string;
  siteId: string | null;
  chamber: string | null;
  sardarPartyId: string | null;
  greenMoulded: string;
  fired: string;
  goodTotal: string;
  broken: string;
  rejects: string;
  /** Null until every batch in the row has been sorted — not zero (ADR-029). */
  unexplained: string | null;
  sortingComplete: boolean;
  batchCount: number;
  pendingSortCount: number;
  /** Ordinary drying and handling loss. */
  preFiringLoss: string;
  /** Went into the kiln, never came out of sorting — the theft signal (ADR-030). */
  postFiringLoss: string | null;
}

export interface YieldVarianceParams {
  from: string;
  to: string;
  siteId?: string;
  chamber?: string;
  sardarPartyId?: string;
  groupBy?: 'batch' | 'chamber' | 'sardar';
}

export const fetchYieldVariance = (params: YieldVarianceParams, signal?: AbortSignal) =>
  apiClient.get<YieldVarianceRow[]>(`/production/yield-variance${query(params)}`, signal);

export interface FuelVarianceRow {
  groupId: string;
  groupLabel: string;
  siteId: string | null;
  chamber: string | null;
  periodMonth: string | null;
  firedTotal: string;
  fuelConsumed: string;
  /** Null when no fuel was booked at all — chase the entry, do not read it as zero. */
  ratio: string | null;
  fuelRecorded: boolean;
  direction: 'over' | 'under' | null;
  isOutlier: boolean;
}

export interface FuelVarianceParams {
  from: string;
  to: string;
  itemId: string;
  siteId?: string;
  groupBy?: 'batch' | 'kiln' | 'month';
}

export const fetchFuelVariance = (params: FuelVarianceParams, signal?: AbortSignal) =>
  apiClient.get<FuelVarianceRow[]>(`/production/fuel-variance${query(params)}`, signal);

export interface ProductionReportRow {
  period: string;
  siteId: string;
  siteName: string;
  brickTypeId: string;
  grade: string;
  goodBricks: string;
  batchCount: number;
}

export interface ProductionReport {
  rows: ProductionReportRow[];
  totals: { goodBricks: string; batchCount: number };
}

export interface ProductionReportParams {
  from: string;
  to: string;
  siteId?: string;
  brickTypeId?: string;
  groupBy?: 'day' | 'month' | 'year';
}

export const fetchProductionReport = (params: ProductionReportParams, signal?: AbortSignal) =>
  apiClient.get<ProductionReport>(`/production/report${query(params)}`, signal);
