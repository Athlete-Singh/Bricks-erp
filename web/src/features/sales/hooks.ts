'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateCreditNoteInput,
  CreateCustomerReceiptInput,
  CreateDebitNoteInput,
  CreateQuotationInput,
  CreateSalesInvoiceInput,
  CreateSalesOrderInput,
  QuotationStatus,
} from '@brics/shared';
import * as api from './api';
import type { ListParams } from './api';

export const salesKeys = {
  quotations: (p: ListParams = {}) => ['sales', 'quotations', p] as const,
  quotation: (id: string) => ['sales', 'quotation', id] as const,
  orders: (p: ListParams = {}) => ['sales', 'orders', p] as const,
  order: (id: string) => ['sales', 'order', id] as const,
  invoices: (p: ListParams = {}) => ['sales', 'invoices', p] as const,
  invoice: (id: string) => ['sales', 'invoice', id] as const,
  receipts: (p: ListParams = {}) => ['sales', 'receipts', p] as const,
  creditNotes: (p: ListParams = {}) => ['sales', 'credit-notes', p] as const,
  debitNotes: (p: ListParams = {}) => ['sales', 'debit-notes', p] as const,
  ageing: (p: object = {}) => ['sales', 'ageing', p] as const,
};

export const useQuotations = (params: ListParams = {}) =>
  useQuery({ queryKey: salesKeys.quotations(params), queryFn: ({ signal }) => api.fetchQuotations(params, signal) });

export const useQuotation = (id: string | null) =>
  useQuery({
    queryKey: salesKeys.quotation(id ?? ''),
    queryFn: ({ signal }) => api.fetchQuotation(id as string, signal),
    enabled: Boolean(id),
  });

export const useSalesOrders = (params: ListParams = {}) =>
  useQuery({ queryKey: salesKeys.orders(params), queryFn: ({ signal }) => api.fetchSalesOrders(params, signal) });

export const useSalesOrder = (id: string | null) =>
  useQuery({
    queryKey: salesKeys.order(id ?? ''),
    queryFn: ({ signal }) => api.fetchSalesOrder(id as string, signal),
    enabled: Boolean(id),
  });

export const useInvoices = (params: ListParams = {}) =>
  useQuery({ queryKey: salesKeys.invoices(params), queryFn: ({ signal }) => api.fetchInvoices(params, signal) });

export const useInvoice = (id: string | null) =>
  useQuery({
    queryKey: salesKeys.invoice(id ?? ''),
    queryFn: ({ signal }) => api.fetchInvoice(id as string, signal),
    enabled: Boolean(id),
  });

export const useReceipts = (params: ListParams = {}) =>
  useQuery({ queryKey: salesKeys.receipts(params), queryFn: ({ signal }) => api.fetchReceipts(params, signal) });

export const useCreditNotes = (params: ListParams = {}) =>
  useQuery({ queryKey: salesKeys.creditNotes(params), queryFn: ({ signal }) => api.fetchCreditNotes(params, signal) });

export const useDebitNotes = (params: ListParams = {}) =>
  useQuery({ queryKey: salesKeys.debitNotes(params), queryFn: ({ signal }) => api.fetchDebitNotes(params, signal) });

export const useReceivablesAgeing = (params: { asOf?: string; customerPartyId?: string; siteId?: string } = {}) =>
  useQuery({
    queryKey: salesKeys.ageing(params),
    queryFn: ({ signal }) => api.fetchReceivablesAgeing(params, signal),
  });

/**
 * Every write invalidates sales **and** stock and accounting: an invoice
 * moves stock OUT, a receipt and a note post journals. Leaving those stale
 * would show a screen that is wrong while the database is right.
 */
function useSalesMutation<T>(mutationFn: (dto: T) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sales'] });
      void queryClient.invalidateQueries({ queryKey: ['stock'] });
      void queryClient.invalidateQueries({ queryKey: ['accounting'] });
    },
  });
}

export const useCreateQuotation = () => useSalesMutation((dto: CreateQuotationInput) => api.createQuotation(dto));
export const useCreateSalesOrder = () => useSalesMutation((dto: CreateSalesOrderInput) => api.createSalesOrder(dto));
export const useCreateInvoice = () => useSalesMutation((dto: CreateSalesInvoiceInput) => api.createInvoice(dto));
export const useCreateReceipt = () => useSalesMutation((dto: CreateCustomerReceiptInput) => api.createReceipt(dto));
export const useCreateCreditNote = () => useSalesMutation((dto: CreateCreditNoteInput) => api.createCreditNote(dto));
export const useCreateDebitNote = () => useSalesMutation((dto: CreateDebitNoteInput) => api.createDebitNote(dto));

export const useChangeQuotationStatus = () =>
  useSalesMutation((args: { id: string; status: QuotationStatus; reason?: string | null }) =>
    api.changeQuotationStatus(args.id, { status: args.status, reason: args.reason }),
  );
export const useCancelSalesOrder = () =>
  useSalesMutation((args: { id: string; reason?: string }) => api.cancelSalesOrder(args.id, args.reason));
