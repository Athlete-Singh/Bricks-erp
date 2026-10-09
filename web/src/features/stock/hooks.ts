'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OpeningStockInput, StockAdjustmentInput } from '@brics/shared';
import * as api from './api';
import type { CurrentStockParams, StockRegisterParams } from './api';

export const stockKeys = {
  current: (params: CurrentStockParams = {}) => ['stock', 'current', params] as const,
  register: (params: StockRegisterParams = {}) => ['stock', 'register', params] as const,
};

export function useCurrentStock(params: CurrentStockParams = {}) {
  return useQuery({
    queryKey: stockKeys.current(params),
    queryFn: ({ signal }) => api.fetchCurrentStock(params, signal),
  });
}

export function useStockRegister(params: StockRegisterParams = {}) {
  return useQuery({
    queryKey: stockKeys.register(params),
    queryFn: ({ signal }) => api.fetchStockRegister(params, signal),
  });
}

/** Both writers invalidate the whole branch — a movement changes every view of it. */
function useStockMutation<T>(mutationFn: (dto: T) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['stock'] }),
  });
}

export function useRecordOpeningStock() {
  return useStockMutation((dto: OpeningStockInput) => api.recordOpeningStock(dto));
}

export function useRecordAdjustment() {
  return useStockMutation((dto: StockAdjustmentInput) => api.recordAdjustment(dto));
}
