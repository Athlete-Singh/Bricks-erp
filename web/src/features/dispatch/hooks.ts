'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateDispatchInput, CreateTripInput, CreateVehicleExpenseInput } from '@brics/shared';
import * as api from './api';
import type { ListParams } from './api';

export const dispatchKeys = {
  dispatches: (p: ListParams = {}) => ['dispatch', 'challans', p] as const,
  dispatch: (id: string) => ['dispatch', 'challan', id] as const,
  gate: (p: object = {}) => ['dispatch', 'gate', p] as const,
  trips: (p: ListParams = {}) => ['dispatch', 'trips', p] as const,
  expenses: (p: ListParams = {}) => ['dispatch', 'expenses', p] as const,
  profitability: (p: object = {}) => ['dispatch', 'vehicle-profit', p] as const,
};

export const useDispatches = (params: ListParams = {}) =>
  useQuery({ queryKey: dispatchKeys.dispatches(params), queryFn: ({ signal }) => api.fetchDispatches(params, signal) });

export const useDispatch = (id: string | null) =>
  useQuery({
    queryKey: dispatchKeys.dispatch(id ?? ''),
    queryFn: ({ signal }) => api.fetchDispatch(id as string, signal),
    enabled: Boolean(id),
  });

export const useGateReconciliation = (params: { fromDate: string; toDate: string; siteId?: string }) =>
  useQuery({
    queryKey: dispatchKeys.gate(params),
    queryFn: ({ signal }) => api.fetchGateReconciliation(params, signal),
    enabled: Boolean(params.fromDate && params.toDate),
  });

export const useTrips = (params: ListParams = {}) =>
  useQuery({ queryKey: dispatchKeys.trips(params), queryFn: ({ signal }) => api.fetchTrips(params, signal) });

export const useVehicleExpenses = (params: ListParams = {}) =>
  useQuery({
    queryKey: dispatchKeys.expenses(params),
    queryFn: ({ signal }) => api.fetchVehicleExpenses(params, signal),
  });

export const useVehicleProfitability = (params: { fromDate: string; toDate: string; vehicleId?: string }) =>
  useQuery({
    queryKey: dispatchKeys.profitability(params),
    queryFn: ({ signal }) => api.fetchVehicleProfitability(params, signal),
    enabled: Boolean(params.fromDate && params.toDate),
  });

/**
 * Every write here can move stock (confirming a challan, issuing fuel) or post
 * a journal (freight, any vehicle charge), so stock and accounting are
 * invalidated alongside dispatch. A screen left stale would be wrong while the
 * database is right.
 */
function useDispatchMutation<T>(mutationFn: (dto: T) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dispatch'] });
      void queryClient.invalidateQueries({ queryKey: ['stock'] });
      void queryClient.invalidateQueries({ queryKey: ['accounting'] });
      void queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
}

export const useCreateDispatch = () => useDispatchMutation((dto: CreateDispatchInput) => api.createDispatch(dto));

export const useConfirmDispatch = () =>
  useDispatchMutation((args: { id: string; confirmedOn?: string | null }) =>
    api.confirmDispatch(args.id, args.confirmedOn),
  );

export const useAcknowledgeDelivery = () =>
  useDispatchMutation((args: { id: string; receivedBy: string; deliveredOn: string; deliveryRemarks?: string | null }) =>
    api.acknowledgeDelivery(args.id, {
      receivedBy: args.receivedBy,
      deliveredOn: args.deliveredOn,
      deliveryRemarks: args.deliveryRemarks ?? null,
    }),
  );

export const useCancelDispatch = () =>
  useDispatchMutation((args: { id: string; reason: string }) => api.cancelDispatch(args.id, args.reason));

export const useCreateTrip = () => useDispatchMutation((dto: CreateTripInput) => api.createTrip(dto));

export const useCreateVehicleExpense = () =>
  useDispatchMutation((dto: CreateVehicleExpenseInput) => api.createVehicleExpense(dto));
