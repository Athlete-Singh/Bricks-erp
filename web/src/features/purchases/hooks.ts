'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateGrnInput,
  CreatePurchaseBillInput,
  CreatePurchaseOrderInput,
  CreatePurchaseReturnInput,
  CreateSupplierPaymentInput,
} from '@brics/shared';
import * as api from './api';
import type { ListParams } from './api';

export const purchaseKeys = {
  orders: (p: ListParams = {}) => ['purchases', 'orders', p] as const,
  order: (id: string) => ['purchases', 'order', id] as const,
  receipts: (p: ListParams = {}) => ['purchases', 'receipts', p] as const,
  receipt: (id: string) => ['purchases', 'receipt', id] as const,
  bills: (p: ListParams = {}) => ['purchases', 'bills', p] as const,
  bill: (id: string) => ['purchases', 'bill', id] as const,
  ageing: (p: object = {}) => ['purchases', 'ageing', p] as const,
};

export const useOrders = (params: ListParams = {}) =>
  useQuery({ queryKey: purchaseKeys.orders(params), queryFn: ({ signal }) => api.fetchOrders(params, signal) });

export const useOrder = (id: string | null) =>
  useQuery({
    queryKey: purchaseKeys.order(id ?? ''),
    queryFn: ({ signal }) => api.fetchOrder(id as string, signal),
    enabled: Boolean(id),
  });

export const useReceipts = (params: ListParams = {}) =>
  useQuery({ queryKey: purchaseKeys.receipts(params), queryFn: ({ signal }) => api.fetchReceipts(params, signal) });

export const useBills = (params: ListParams = {}) =>
  useQuery({ queryKey: purchaseKeys.bills(params), queryFn: ({ signal }) => api.fetchBills(params, signal) });

export const useBill = (id: string | null) =>
  useQuery({
    queryKey: purchaseKeys.bill(id ?? ''),
    queryFn: ({ signal }) => api.fetchBill(id as string, signal),
    enabled: Boolean(id),
  });

export const usePayablesAgeing = (params: { asOf?: string; supplierPartyId?: string; siteId?: string } = {}) =>
  useQuery({
    queryKey: purchaseKeys.ageing(params),
    queryFn: ({ signal }) => api.fetchPayablesAgeing(params, signal),
  });

/**
 * Every write invalidates purchases **and** stock and accounting: a receipt
 * moves stock, a bill and a payment post journals. Leaving those stale would
 * show a screen that is wrong while the database is right.
 */
function usePurchaseMutation<T>(mutationFn: (dto: T) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['purchases'] });
      void queryClient.invalidateQueries({ queryKey: ['stock'] });
      void queryClient.invalidateQueries({ queryKey: ['accounting'] });
    },
  });
}

export const useCreateOrder = () => usePurchaseMutation((dto: CreatePurchaseOrderInput) => api.createOrder(dto));
export const useCreateReceipt = () => usePurchaseMutation((dto: CreateGrnInput) => api.createReceipt(dto));
export const useCreateBill = () => usePurchaseMutation((dto: CreatePurchaseBillInput) => api.createBill(dto));
export const useCreatePayment = () => usePurchaseMutation((dto: CreateSupplierPaymentInput) => api.createPayment(dto));
export const useCreateReturn = () => usePurchaseMutation((dto: CreatePurchaseReturnInput) => api.createReturn(dto));
