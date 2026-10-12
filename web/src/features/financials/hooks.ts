'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateExpenseInput, SetClosingStockRatesInput } from '@brics/shared';
import * as api from './api';

export const financialsKeys = {
  categories: () => ['financials', 'categories'] as const,
  expenses: (p: object = {}) => ['financials', 'expenses', p] as const,
  book: (kind: string, p: object) => ['financials', 'book', kind, p] as const,
  closingStock: (p: object) => ['financials', 'closing-stock', p] as const,
  pnl: (p: object) => ['financials', 'pnl', p] as const,
  balanceSheet: (p: object) => ['financials', 'balance-sheet', p] as const,
  partyBalances: (p: object) => ['financials', 'party-balances', p] as const,
  gstr1: (p: object) => ['financials', 'gstr1', p] as const,
  gstr3b: (p: object) => ['financials', 'gstr3b', p] as const,
  gstRecon: (p: object) => ['financials', 'gst-recon', p] as const,
};

export const useExpenseCategories = () =>
  useQuery({ queryKey: financialsKeys.categories(), queryFn: ({ signal }) => api.fetchExpenseCategories(signal) });

export const useExpenses = (params: Parameters<typeof api.fetchExpenses>[0] = {}) =>
  useQuery({ queryKey: financialsKeys.expenses(params), queryFn: ({ signal }) => api.fetchExpenses(params, signal) });

export const useBook = (kind: 'cash' | 'bank', params: { fromDate: string; toDate: string; siteId?: string }) =>
  useQuery({
    queryKey: financialsKeys.book(kind, params),
    queryFn: ({ signal }) => api.fetchBook(kind, params, signal),
    enabled: Boolean(params.fromDate && params.toDate),
  });

export const useClosingStock = (params: { asOf: string; siteId?: string }) =>
  useQuery({
    queryKey: financialsKeys.closingStock(params),
    queryFn: ({ signal }) => api.fetchClosingStock(params, signal),
    enabled: Boolean(params.asOf),
  });

export const useProfitAndLoss = (params: { fromDate: string; toDate: string; siteId?: string }) =>
  useQuery({
    queryKey: financialsKeys.pnl(params),
    queryFn: ({ signal }) => api.fetchProfitAndLoss(params, signal),
    enabled: Boolean(params.fromDate && params.toDate),
  });

export const useBalanceSheet = (params: { asOf: string; siteId?: string }) =>
  useQuery({
    queryKey: financialsKeys.balanceSheet(params),
    queryFn: ({ signal }) => api.fetchBalanceSheet(params, signal),
    enabled: Boolean(params.asOf),
  });

export const usePartyBalances = (params: { asOf: string; partyType?: 'customer' | 'supplier' }) =>
  useQuery({
    queryKey: financialsKeys.partyBalances(params),
    queryFn: ({ signal }) => api.fetchPartyBalances(params, signal),
    enabled: Boolean(params.asOf),
  });

export const useGstr1 = (params: { month: string; siteId?: string }) =>
  useQuery({
    queryKey: financialsKeys.gstr1(params),
    queryFn: ({ signal }) => api.fetchGstr1(params, signal),
    enabled: Boolean(params.month),
  });

export const useGstr3b = (params: { month: string; siteId?: string }) =>
  useQuery({
    queryKey: financialsKeys.gstr3b(params),
    queryFn: ({ signal }) => api.fetchGstr3b(params, signal),
    enabled: Boolean(params.month),
  });

export const useGstReconciliation = (params: { month: string; siteId?: string }) =>
  useQuery({
    queryKey: financialsKeys.gstRecon(params),
    queryFn: ({ signal }) => api.fetchGstReconciliation(params, signal),
    enabled: Boolean(params.month),
  });

/**
 * An expense posts a journal and moves cash, and a closing rate changes what
 * both statements say — so accounting and every financial read go stale
 * together rather than one screen being right while another is not.
 */
function useFinancialsMutation<T>(mutationFn: (dto: T) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['financials'] });
      void queryClient.invalidateQueries({ queryKey: ['accounting'] });
    },
  });
}

export const useCreateExpense = () => useFinancialsMutation((dto: CreateExpenseInput) => api.createExpense(dto));
export const useSetClosingStockRates = () =>
  useFinancialsMutation((dto: SetClosingStockRatesInput) => api.setClosingStockRates(dto));
