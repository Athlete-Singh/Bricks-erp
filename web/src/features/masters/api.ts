import { apiClient } from '@/lib/api-client';
import type {
  PartyType,
  CreatePartyInput,
  UpdatePartyInput,
  CreateUnitInput,
  UpdateUnitInput,
  CreateBrickTypeInput,
  UpdateBrickTypeInput,
  CreateWarehouseInput,
  UpdateWarehouseInput,
  CreateItemInput,
  UpdateItemInput,
  CreateDriverInput,
  UpdateDriverInput,
  CreateVehicleInput,
  UpdateVehicleInput,
  CreateHsnRateInput,
  UpdateHsnRateInput,
  CreateWageRateInput,
  UpdateWageRateInput,
} from '@brics/shared';

// ── shared ────────────────────────────────────────────────────────────────────

/**
 * Blank filter fields must not be sent — the query schemas validate `.min(1)`
 * on `search`, so an empty box would 400 rather than mean "no filter".
 * Generic over the param object because the filter interfaces have no index
 * signature.
 */
function query<T extends object>(params: T): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params) as [string, unknown][]) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

/** Every master list is paginated, so they all come back enveloped with `meta`. */
export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: 'true' | 'false';
}

// ── parties ───────────────────────────────────────────────────────────────────

export interface Party {
  id: string;
  name: string;
  partyTypes: PartyType[];
  gstin: string | null;
  pan: string | null;
  stateCode: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  openingDebit: string;
  openingCredit: string;
  ledgerId: string | null;
  isActive: boolean;
  companyId: string;
}

/** The filter key is `type`, matching `partyQuerySchema` — not `partyType`. */
export interface PartyListParams extends ListParams {
  type?: string;
}

export const fetchParties = (params: PartyListParams = {}, signal?: AbortSignal) =>
  apiClient.getPaged<Party>(`/parties${query(params)}`, signal);

export const fetchParty = (id: string, signal?: AbortSignal) => apiClient.get<Party>(`/parties/${id}`, signal);

export const createParty = (dto: CreatePartyInput) => apiClient.post<Party>('/parties', dto);

export const updateParty = (id: string, dto: UpdatePartyInput) => apiClient.patch<Party>(`/parties/${id}`, dto);

// ── inventory ─────────────────────────────────────────────────────────────────
// All of these hang off the `inventory` controller prefix.

export interface Unit {
  id: string;
  name: string;
  abbreviation: string;
  isActive: boolean;
}

export const fetchUnits = (params: ListParams = {}, signal?: AbortSignal) =>
  apiClient.getPaged<Unit>(`/inventory/units${query(params)}`, signal);
export const createUnit = (dto: CreateUnitInput) => apiClient.post<Unit>('/inventory/units', dto);
export const updateUnit = (id: string, dto: UpdateUnitInput) => apiClient.patch<Unit>(`/inventory/units/${id}`, dto);

export interface BrickType {
  id: string;
  grade: string;
  /** The item this grade is stocked and sold as (ADR-051). */
  itemId: string;
  description: string | null;
  isActive: boolean;
}

export const fetchBrickTypes = (params: ListParams = {}, signal?: AbortSignal) =>
  apiClient.getPaged<BrickType>(`/inventory/brick-types${query(params)}`, signal);
export const createBrickType = (dto: CreateBrickTypeInput) => apiClient.post<BrickType>('/inventory/brick-types', dto);
export const updateBrickType = (id: string, dto: UpdateBrickTypeInput) =>
  apiClient.patch<BrickType>(`/inventory/brick-types/${id}`, dto);

export interface Warehouse {
  id: string;
  name: string;
  siteId: string;
  isActive: boolean;
}

export const fetchWarehouses = (params: ListParams = {}, signal?: AbortSignal) =>
  apiClient.getPaged<Warehouse>(`/inventory/warehouses${query(params)}`, signal);
export const createWarehouse = (dto: CreateWarehouseInput) => apiClient.post<Warehouse>('/inventory/warehouses', dto);
export const updateWarehouse = (id: string, dto: UpdateWarehouseInput) =>
  apiClient.patch<Warehouse>(`/inventory/warehouses/${id}`, dto);

export interface Item {
  id: string;
  name: string;
  category: string;
  unitId: string;
  hsnId: string | null;
  isActive: boolean;
}

export const fetchItems = (params: ListParams = {}, signal?: AbortSignal) =>
  apiClient.getPaged<Item>(`/inventory/items${query(params)}`, signal);
export const createItem = (dto: CreateItemInput) => apiClient.post<Item>('/inventory/items', dto);
export const updateItem = (id: string, dto: UpdateItemInput) => apiClient.patch<Item>(`/inventory/items/${id}`, dto);

// ── transport ─────────────────────────────────────────────────────────────────

export interface Driver {
  id: string;
  name: string;
  phone: string | null;
  licenseNo: string | null;
  isActive: boolean;
}

export const fetchDrivers = (params: ListParams = {}, signal?: AbortSignal) =>
  apiClient.getPaged<Driver>(`/transport/drivers${query(params)}`, signal);
export const createDriver = (dto: CreateDriverInput) => apiClient.post<Driver>('/transport/drivers', dto);
export const updateDriver = (id: string, dto: UpdateDriverInput) =>
  apiClient.patch<Driver>(`/transport/drivers/${id}`, dto);

export interface Vehicle {
  id: string;
  registrationNo: string;
  type: string;
  ownerType: string;
  partyId: string | null;
  isActive: boolean;
}

export const fetchVehicles = (params: ListParams = {}, signal?: AbortSignal) =>
  apiClient.getPaged<Vehicle>(`/transport/vehicles${query(params)}`, signal);
export const createVehicle = (dto: CreateVehicleInput) => apiClient.post<Vehicle>('/transport/vehicles', dto);
export const updateVehicle = (id: string, dto: UpdateVehicleInput) =>
  apiClient.patch<Vehicle>(`/transport/vehicles/${id}`, dto);

// ── taxes ─────────────────────────────────────────────────────────────────────

/** Rates are decimal strings, like money — never parsed into a float. */
export interface HsnRate {
  id: string;
  hsnCode: string;
  description: string | null;
  cgstRate: string;
  sgstRate: string;
  igstRate: string;
  /** ADR-018 — the date this rate takes effect; older invoices keep their rate. */
  effectiveFrom: string;
  isActive: boolean;
}

export const fetchHsnRates = (params: ListParams = {}, signal?: AbortSignal) =>
  apiClient.getPaged<HsnRate>(`/taxes/hsn-rates${query(params)}`, signal);
export const createHsnRate = (dto: CreateHsnRateInput) => apiClient.post<HsnRate>('/taxes/hsn-rates', dto);
export const updateHsnRate = (id: string, dto: UpdateHsnRateInput) =>
  apiClient.patch<HsnRate>(`/taxes/hsn-rates/${id}`, dto);

// ── labour ────────────────────────────────────────────────────────────────────

export interface WageRate {
  id: string;
  activity: string;
  unit: string;
  rateAmount: string;
  effectiveFrom: string;
  isActive: boolean;
}

export const fetchWageRates = (params: ListParams = {}, signal?: AbortSignal) =>
  apiClient.getPaged<WageRate>(`/labour/wage-rates${query(params)}`, signal);
export const createWageRate = (dto: CreateWageRateInput) => apiClient.post<WageRate>('/labour/wage-rates', dto);
export const updateWageRate = (id: string, dto: UpdateWageRateInput) =>
  apiClient.patch<WageRate>(`/labour/wage-rates/${id}`, dto);
