'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
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
import * as api from './api';
import type { ListParams, PartyListParams } from './api';

// ── cache keys ────────────────────────────────────────────────────────────────

export const mastersKeys = {
  parties: (params: PartyListParams = {}) => ['masters', 'parties', params] as const,
  party: (id: string) => ['masters', 'parties', id] as const,
  units: (params: ListParams = {}) => ['masters', 'units', params] as const,
  brickTypes: (params: ListParams = {}) => ['masters', 'brick-types', params] as const,
  warehouses: (params: ListParams = {}) => ['masters', 'warehouses', params] as const,
  items: (params: ListParams = {}) => ['masters', 'items', params] as const,
  drivers: (params: ListParams = {}) => ['masters', 'drivers', params] as const,
  vehicles: (params: ListParams = {}) => ['masters', 'vehicles', params] as const,
  hsnRates: (params: ListParams = {}) => ['masters', 'hsn-rates', params] as const,
  wageRates: (params: ListParams = {}) => ['masters', 'wage-rates', params] as const,
};

const MASTERS_STALE_TIME = 2 * 60 * 1000; // 2 minutes — these rarely change within a session

// ── parties ───────────────────────────────────────────────────────────────────

export function useParties(params: PartyListParams = {}) {
  return useQuery({
    queryKey: mastersKeys.parties(params),
    queryFn: ({ signal }) => api.fetchParties(params, signal),
    staleTime: MASTERS_STALE_TIME,
  });
}

export function useParty(id: string | null) {
  return useQuery({
    queryKey: mastersKeys.party(id ?? ''),
    queryFn: ({ signal }) => api.fetchParty(id as string, signal),
    enabled: Boolean(id),
  });
}

export function useCreateParty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreatePartyInput) => api.createParty(dto),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['masters', 'parties'] }),
  });
}

export function useUpdateParty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePartyInput }) => api.updateParty(id, dto),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['masters', 'parties'] }),
  });
}

// ── units ─────────────────────────────────────────────────────────────────────

export function useUnits(params: ListParams = {}) {
  return useQuery({
    queryKey: mastersKeys.units(params),
    queryFn: ({ signal }) => api.fetchUnits(params, signal),
    staleTime: MASTERS_STALE_TIME,
  });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateUnitInput) => api.createUnit(dto),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['masters', 'units'] }),
  });
}

export function useUpdateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateUnitInput }) => api.updateUnit(id, dto),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['masters', 'units'] }),
  });
}

// ── brick types ───────────────────────────────────────────────────────────────

export function useBrickTypes(params: ListParams = {}) {
  return useQuery({
    queryKey: mastersKeys.brickTypes(params),
    queryFn: ({ signal }) => api.fetchBrickTypes(params, signal),
    staleTime: MASTERS_STALE_TIME,
  });
}

export function useCreateBrickType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateBrickTypeInput) => api.createBrickType(dto),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['masters', 'brick-types'] }),
  });
}

export function useUpdateBrickType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateBrickTypeInput }) => api.updateBrickType(id, dto),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['masters', 'brick-types'] }),
  });
}

// ── warehouses ────────────────────────────────────────────────────────────────

export function useWarehouses(params: ListParams = {}) {
  return useQuery({
    queryKey: mastersKeys.warehouses(params),
    queryFn: ({ signal }) => api.fetchWarehouses(params, signal),
    staleTime: MASTERS_STALE_TIME,
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateWarehouseInput) => api.createWarehouse(dto),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['masters', 'warehouses'] }),
  });
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateWarehouseInput }) => api.updateWarehouse(id, dto),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['masters', 'warehouses'] }),
  });
}

// ── items ─────────────────────────────────────────────────────────────────────

export function useItems(params: ListParams = {}) {
  return useQuery({
    queryKey: mastersKeys.items(params),
    queryFn: ({ signal }) => api.fetchItems(params, signal),
    staleTime: MASTERS_STALE_TIME,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateItemInput) => api.createItem(dto),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['masters', 'items'] }),
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateItemInput }) => api.updateItem(id, dto),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['masters', 'items'] }),
  });
}

// ── drivers ───────────────────────────────────────────────────────────────────

export function useDrivers(params: ListParams = {}) {
  return useQuery({
    queryKey: mastersKeys.drivers(params),
    queryFn: ({ signal }) => api.fetchDrivers(params, signal),
    staleTime: MASTERS_STALE_TIME,
  });
}

export function useCreateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateDriverInput) => api.createDriver(dto),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['masters', 'drivers'] }),
  });
}

export function useUpdateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateDriverInput }) => api.updateDriver(id, dto),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['masters', 'drivers'] }),
  });
}

// ── vehicles ──────────────────────────────────────────────────────────────────

export function useVehicles(params: ListParams = {}) {
  return useQuery({
    queryKey: mastersKeys.vehicles(params),
    queryFn: ({ signal }) => api.fetchVehicles(params, signal),
    staleTime: MASTERS_STALE_TIME,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateVehicleInput) => api.createVehicle(dto),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['masters', 'vehicles'] }),
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateVehicleInput }) => api.updateVehicle(id, dto),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['masters', 'vehicles'] }),
  });
}

// ── HSN rates ─────────────────────────────────────────────────────────────────

export function useHsnRates(params: ListParams = {}) {
  return useQuery({
    queryKey: mastersKeys.hsnRates(params),
    queryFn: ({ signal }) => api.fetchHsnRates(params, signal),
    staleTime: MASTERS_STALE_TIME,
  });
}

export function useCreateHsnRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateHsnRateInput) => api.createHsnRate(dto),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['masters', 'hsn-rates'] }),
  });
}

export function useUpdateHsnRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateHsnRateInput }) => api.updateHsnRate(id, dto),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['masters', 'hsn-rates'] }),
  });
}

// ── wage rates ────────────────────────────────────────────────────────────────

export function useWageRates(params: ListParams = {}) {
  return useQuery({
    queryKey: mastersKeys.wageRates(params),
    queryFn: ({ signal }) => api.fetchWageRates(params, signal),
    staleTime: MASTERS_STALE_TIME,
  });
}

export function useCreateWageRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateWageRateInput) => api.createWageRate(dto),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['masters', 'wage-rates'] }),
  });
}

export function useUpdateWageRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateWageRateInput }) => api.updateWageRate(id, dto),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['masters', 'wage-rates'] }),
  });
}
