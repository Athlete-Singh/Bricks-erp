import { apiClient } from '@/lib/api-client';
import type { OpeningStockInput, StockAdjustmentInput } from '@brics/shared';

function query<T extends object>(params: T): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params) as [string, unknown][]) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

/**
 * One line of the current-stock report. The columns spell out INV-07's
 * identity, so an owner who distrusts `closing` can see what produced it.
 */
export interface CurrentStockRow {
  siteId: string;
  siteName: string;
  warehouseId: string;
  warehouseName: string;
  subjectType: 'item' | 'brick';
  subjectId: string;
  subjectName: string;
  unit: string | null;
  opening: string;
  purchased: string;
  produced: string;
  adjustedIn: string;
  transferredIn: string;
  sold: string;
  wasted: string;
  adjustedOut: string;
  transferredOut: string;
  closing: string;
}

export interface CurrentStock {
  asOf: string;
  from: string | null;
  rows: CurrentStockRow[];
  totals: { totalIn: string; totalOut: string };
}

export interface CurrentStockParams {
  asOf?: string;
  from?: string;
  siteId?: string;
  warehouseId?: string;
  subject?: 'item' | 'brick' | 'all';
  includeZero?: 'true' | 'false';
}

export const fetchCurrentStock = (params: CurrentStockParams = {}, signal?: AbortSignal) =>
  apiClient.get<CurrentStock>(`/stock/current${query(params)}`, signal);

export interface StockRegisterRow {
  id: string;
  movementDate: string;
  movementType: string;
  warehouseId: string;
  warehouseName: string;
  subjectType: 'item' | 'brick';
  subjectId: string;
  subjectName: string;
  quantityIn: string;
  quantityOut: string;
  /** Only present when the filters narrow to one subject in one warehouse. */
  runningBalance: string | null;
  sourceType: string | null;
  sourceId: string | null;
  notes: string | null;
}

export interface StockRegisterParams {
  page?: number;
  limit?: number;
  warehouseId?: string;
  itemId?: string;
  brickTypeId?: string;
  movementType?: string;
  from?: string;
  to?: string;
}

export const fetchStockRegister = (params: StockRegisterParams = {}, signal?: AbortSignal) =>
  apiClient.getPaged<StockRegisterRow>(`/stock/register${query(params)}`, signal);

export const recordOpeningStock = (dto: OpeningStockInput) => apiClient.post<unknown>('/stock/opening', dto);

export const recordAdjustment = (dto: StockAdjustmentInput) => apiClient.post<unknown>('/stock/adjustments', dto);
