'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateLedgerDto,
  CreateVoucherDto,
  ReverseVoucherDto,
  SetOpeningBalancesDto,
  UpdateLedgerDto,
} from '@brics/shared';
import * as api from './api';
import type { DayBookParams, TrialBalanceParams } from './api';

export const accountingKeys = {
  groups: ['accounting', 'groups'] as const,
  ledgers: ['accounting', 'ledgers'] as const,
  voucherTypes: ['accounting', 'voucher-types'] as const,
  openingSummary: ['accounting', 'opening-summary'] as const,
  dayBook: (params: DayBookParams) => ['accounting', 'day-book', params] as const,
  statement: (id: string, params: object) => ['accounting', 'statement', id, params] as const,
  trialBalance: (params: TrialBalanceParams) => ['accounting', 'trial-balance', params] as const,
};

// The chart rarely changes within a session, so it is cached for a while and
// used by every voucher form's ledger picker.
const CHART_STALE_TIME = 5 * 60 * 1000;

export function useLedgerGroups() {
  return useQuery({
    queryKey: accountingKeys.groups,
    queryFn: ({ signal }) => api.fetchLedgerGroups(signal),
    staleTime: CHART_STALE_TIME,
  });
}

export function useLedgers() {
  return useQuery({
    queryKey: accountingKeys.ledgers,
    queryFn: ({ signal }) => api.fetchLedgers(signal),
    staleTime: CHART_STALE_TIME,
  });
}

export function useVoucherTypes() {
  return useQuery({
    queryKey: accountingKeys.voucherTypes,
    queryFn: ({ signal }) => api.fetchVoucherTypes(signal),
    staleTime: Infinity,
  });
}

export function useOpeningSummary() {
  return useQuery({
    queryKey: accountingKeys.openingSummary,
    queryFn: ({ signal }) => api.fetchOpeningSummary(signal),
  });
}

export function useDayBook(params: DayBookParams) {
  return useQuery({
    queryKey: accountingKeys.dayBook(params),
    queryFn: ({ signal }) => api.fetchDayBook(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useLedgerStatement(ledgerId: string | null, params: { from?: string; to?: string }) {
  return useQuery({
    queryKey: accountingKeys.statement(ledgerId ?? '', params),
    queryFn: ({ signal }) => api.fetchLedgerStatement(ledgerId as string, params, signal),
    enabled: Boolean(ledgerId),
  });
}

export function useTrialBalance(params: TrialBalanceParams) {
  return useQuery({
    queryKey: accountingKeys.trialBalance(params),
    queryFn: ({ signal }) => api.fetchTrialBalance(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useCreateLedger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateLedgerDto) => api.createLedger(dto),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: accountingKeys.ledgers }),
  });
}

export function useUpdateLedger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateLedgerDto }) => api.updateLedger(id, dto),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: accountingKeys.ledgers }),
  });
}

export function useSetOpeningBalances() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: SetOpeningBalancesDto) => api.setOpeningBalances(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountingKeys.ledgers });
      void queryClient.invalidateQueries({ queryKey: accountingKeys.openingSummary });
      // Opening balances move every closing balance in the trial balance.
      void queryClient.invalidateQueries({ queryKey: ['accounting', 'trial-balance'] });
      void queryClient.invalidateQueries({ queryKey: ['accounting', 'statement'] });
    },
  });
}

/** Posting changes the books, so every derived report is dropped. */
function invalidateBooks(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['accounting', 'day-book'] });
  void queryClient.invalidateQueries({ queryKey: ['accounting', 'trial-balance'] });
  void queryClient.invalidateQueries({ queryKey: ['accounting', 'statement'] });
}

export function useCreateVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateVoucherDto) => api.createVoucher(dto),
    onSuccess: () => invalidateBooks(queryClient),
  });
}

export function useReverseVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ReverseVoucherDto }) => api.reverseVoucher(id, dto),
    onSuccess: () => invalidateBooks(queryClient),
  });
}
