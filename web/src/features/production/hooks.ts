'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ProductionBatchCreateInput,
  ProductionDryingInput,
  ProductionFiringInput,
  ProductionMakingInput,
  ProductionSortingInput,
} from '@brics/shared';
import * as api from './api';
import type { BatchListParams, FuelVarianceParams, ProductionReportParams, YieldVarianceParams } from './api';

export const productionKeys = {
  batches: (params: BatchListParams = {}) => ['production', 'batches', params] as const,
  batch: (id: string) => ['production', 'batch', id] as const,
  yield: (params: YieldVarianceParams) => ['production', 'yield', params] as const,
  fuel: (params: FuelVarianceParams) => ['production', 'fuel', params] as const,
  report: (params: ProductionReportParams) => ['production', 'report', params] as const,
};

export function useBatches(params: BatchListParams = {}) {
  return useQuery({
    queryKey: productionKeys.batches(params),
    queryFn: ({ signal }) => api.fetchBatches(params, signal),
  });
}

export function useBatch(id: string | null) {
  return useQuery({
    queryKey: productionKeys.batch(id ?? ''),
    queryFn: ({ signal }) => api.fetchBatch(id as string, signal),
    enabled: Boolean(id),
  });
}

/**
 * Every write invalidates the whole production branch **and** stock: sorting
 * puts bricks into finished stock and the stages consume raw materials, so a
 * stale stock screen after recording a stage would be wrong on screen while
 * right in the database.
 */
function useProductionMutation<T>(mutationFn: (input: T) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['production'] });
      void queryClient.invalidateQueries({ queryKey: ['stock'] });
    },
  });
}

export function useCreateBatch() {
  return useProductionMutation((dto: ProductionBatchCreateInput) => api.createBatch(dto));
}

export function useRecordMaking() {
  return useProductionMutation(({ batchId, dto }: { batchId: string; dto: ProductionMakingInput }) =>
    api.recordMaking(batchId, dto),
  );
}

export function useRecordDrying() {
  return useProductionMutation(({ batchId, dto }: { batchId: string; dto: ProductionDryingInput }) =>
    api.recordDrying(batchId, dto),
  );
}

export function useRecordFiring() {
  return useProductionMutation(({ batchId, dto }: { batchId: string; dto: ProductionFiringInput }) =>
    api.recordFiring(batchId, dto),
  );
}

export function useRecordSorting() {
  return useProductionMutation(({ batchId, dto }: { batchId: string; dto: ProductionSortingInput }) =>
    api.recordSorting(batchId, dto),
  );
}

export function useYieldVariance(params: YieldVarianceParams) {
  return useQuery({
    queryKey: productionKeys.yield(params),
    queryFn: ({ signal }) => api.fetchYieldVariance(params, signal),
  });
}

export function useFuelVariance(params: FuelVarianceParams, enabled = true) {
  return useQuery({
    queryKey: productionKeys.fuel(params),
    queryFn: ({ signal }) => api.fetchFuelVariance(params, signal),
    // The fuel item is required by the API, so do not ask until one is chosen.
    enabled: enabled && Boolean(params.itemId),
  });
}

export function useProductionReport(params: ProductionReportParams) {
  return useQuery({
    queryKey: productionKeys.report(params),
    queryFn: ({ signal }) => api.fetchProductionReport(params, signal),
  });
}
