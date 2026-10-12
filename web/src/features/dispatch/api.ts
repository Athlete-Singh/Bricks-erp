import { apiClient } from '@/lib/api-client';
import type {
  CreateDispatchInput,
  CreateTripInput,
  CreateVehicleExpenseInput,
  DispatchStatus,
  VehicleExpenseKind,
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

// ── types ─────────────────────────────────────────────────────────────────────

export interface Dispatch {
  id: string;
  challanNo: string;
  siteId: string;
  customerPartyId: string;
  salesInvoiceId: string | null;
  salesOrderId: string | null;
  vehicleId: string | null;
  driverId: string | null;
  loadingGroupId: string | null;
  dispatchDate: string;
  loadingLocation: string | null;
  deliveryLocation: string | null;
  status: DispatchStatus;
  movedStock: boolean;
  confirmedAt: string | null;
  deliveredOn: string | null;
  receivedBy: string | null;
  deliveryRemarks: string | null;
  cancelReason: string | null;
  notes: string | null;
}

export interface DispatchLine {
  id: string;
  dispatchId: string;
  itemId: string;
  warehouseId: string;
  quantity: string;
  notes: string | null;
}

export interface GateRow {
  dispatchId: string;
  challanNo: string;
  dispatchDate: string;
  status: DispatchStatus;
  customerName: string;
  vehicleNo: string | null;
  invoiceNo: string | null;
  dispatchedQuantity: string;
  invoicedQuantity: string | null;
  stockMovedBy: 'dispatch' | 'invoice';
  stockQuantity: string;
  unbilled: boolean;
  quantityMismatch: boolean;
}

export interface GateMeta {
  fromDate: string;
  toDate: string;
  dispatchCount: number;
  dispatchedQuantity: string;
  invoicedQuantity: string;
  unbilledCount: number;
  unbilledQuantity: string;
  mismatchCount: number;
}

export interface VehicleTrip {
  id: string;
  tripNo: string;
  vehicleId: string;
  driverId: string | null;
  dispatchId: string | null;
  siteId: string;
  tripDate: string;
  routeFrom: string | null;
  routeTo: string | null;
  distanceKm: string | null;
  freightAmount: string | null;
  freightPartyId: string | null;
  voucherId: string | null;
  notes: string | null;
}

export interface VehicleExpense {
  id: string;
  vehicleId: string;
  tripId: string | null;
  siteId: string;
  kind: VehicleExpenseKind;
  expenseDate: string;
  amount: string;
  quantity: string | null;
  paidFromLedgerId: string | null;
  partyId: string | null;
  itemId: string | null;
  warehouseId: string | null;
  stockMovementId: string | null;
  voucherId: string | null;
  reference: string | null;
  notes: string | null;
}

export interface VehicleProfitRow {
  vehicleId: string;
  registrationNo: string;
  ownerType: string;
  tripCount: number;
  distanceKm: string;
  freightIncome: string;
  diesel: string;
  maintenance: string;
  loading: string;
  hire: string;
  totalCost: string;
  net: string;
  litresPer100Km: string | null;
  costPerKm: string | null;
}

export interface VehicleProfitMeta {
  fromDate: string;
  toDate: string;
  vehicleCount: number;
  freightIncome: string;
  totalCost: string;
  net: string;
}

export interface ListParams {
  page?: number;
  limit?: number;
  status?: DispatchStatus;
  customerPartyId?: string;
  vehicleId?: string;
  siteId?: string;
  fromDate?: string;
  toDate?: string;
  kind?: VehicleExpenseKind;
  tripId?: string;
  driverId?: string;
}

// ── dispatch ──────────────────────────────────────────────────────────────────

export const fetchDispatches = (params: ListParams = {}, signal?: AbortSignal) =>
  apiClient.getPaged<Dispatch>(`/dispatches${query(params)}`, signal);

export const fetchDispatch = (id: string, signal?: AbortSignal) =>
  apiClient.get<Dispatch & { lines: DispatchLine[] }>(`/dispatches/${id}`, signal);

export const createDispatch = (dto: CreateDispatchInput) => apiClient.post<Dispatch>('/dispatches', dto);

export const confirmDispatch = (id: string, confirmedOn?: string | null) =>
  apiClient.patch<Dispatch>(`/dispatches/${id}/confirm`, { confirmedOn: confirmedOn ?? null });

export const acknowledgeDelivery = (
  id: string,
  dto: { receivedBy: string; deliveredOn: string; deliveryRemarks?: string | null },
) => apiClient.patch<Dispatch>(`/dispatches/${id}/acknowledge`, dto);

export const cancelDispatch = (id: string, reason: string) =>
  apiClient.patch<Dispatch>(`/dispatches/${id}/cancel`, { reason });

/**
 * DSP-05 — fetch the challan PDF with the in-memory Bearer token (ADR-016) and
 * hand back an object URL. Callers open it and revoke the URL afterwards.
 */
export async function fetchChallanPdfObjectUrl(id: string): Promise<string> {
  const blob = await apiClient.getBlob(`/dispatches/${id}/pdf`);
  return URL.createObjectURL(blob);
}

export const fetchGateReconciliation = (
  params: { fromDate: string; toDate: string; siteId?: string },
  signal?: AbortSignal,
) => apiClient.getWithMeta<GateRow, GateMeta>(`/dispatches/gate-reconciliation${query(params)}`, signal);

// ── transport operations ──────────────────────────────────────────────────────

export const fetchTrips = (params: ListParams = {}, signal?: AbortSignal) =>
  apiClient.getPaged<VehicleTrip>(`/transport/trips${query(params)}`, signal);

export const createTrip = (dto: CreateTripInput) => apiClient.post<VehicleTrip>('/transport/trips', dto);

export const fetchVehicleExpenses = (params: ListParams = {}, signal?: AbortSignal) =>
  apiClient.getPaged<VehicleExpense>(`/transport/expenses${query(params)}`, signal);

export const createVehicleExpense = (dto: CreateVehicleExpenseInput) =>
  apiClient.post<VehicleExpense>('/transport/expenses', dto);

export const fetchVehicleProfitability = (
  params: { fromDate: string; toDate: string; vehicleId?: string },
  signal?: AbortSignal,
) =>
  apiClient.getWithMeta<VehicleProfitRow, VehicleProfitMeta>(
    `/transport/vehicle-profitability${query(params)}`,
    signal,
  );
