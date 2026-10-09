import type {
  CreateLedgerDto,
  CreateVoucherDto,
  LedgerNature,
  ReverseVoucherDto,
  SetOpeningBalancesDto,
  UpdateLedgerDto,
} from '@brics/shared';
import { apiClient, type PageMeta } from '@/lib/api-client';

export interface LedgerGroup {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  nature: LedgerNature;
  isDirect: boolean;
  isSystem: boolean;
}

export interface Ledger {
  id: string;
  groupId: string;
  name: string;
  code: string | null;
  openingDebit: string;
  openingCredit: string;
  isSystem: boolean;
  isActive: boolean;
}

export interface VoucherType {
  id: string;
  code: string;
  name: string;
  prefix: string;
}

export interface Voucher {
  id: string;
  number: string;
  voucherDate: string;
  status: 'posted' | 'reversed';
  narration: string | null;
  reversalOfId: string | null;
}

export interface VoucherLine {
  id: string;
  ledgerId: string;
  debit: string;
  credit: string;
  narration: string | null;
}

export interface OpeningBalanceSummary {
  totalDebit: string;
  totalCredit: string;
  difference: string;
  isBalanced: boolean;
}

export interface DayBookEntry {
  voucherId: string;
  number: string;
  voucherDate: string;
  voucherType: string;
  status: string;
  narration: string | null;
  reversalOfId: string | null;
  lines: Array<{ ledgerId: string; ledgerName: string; debit: string; credit: string; narration: string | null }>;
  totalDebit: string;
}

export interface LedgerStatement {
  ledger: { id: string; name: string; code: string | null };
  group: { id: string; name: string; nature: LedgerNature };
  opening: { debit: string; credit: string };
  rows: Array<{
    voucherId: string;
    number: string;
    voucherDate: string;
    voucherType: string;
    narration: string | null;
    debit: string;
    credit: string;
    runningBalance: string;
  }>;
  totals: { debit: string; credit: string };
  closing: { debit: string; credit: string };
}

export interface TrialBalance {
  asOf: string;
  rows: Array<{
    ledgerId: string;
    ledgerName: string;
    groupId: string;
    groupName: string;
    nature: LedgerNature;
    openingDebit: string;
    openingCredit: string;
    periodDebit: string;
    periodCredit: string;
    closingDebit: string;
    closingCredit: string;
  }>;
  totals: {
    openingDebit: string;
    openingCredit: string;
    periodDebit: string;
    periodCredit: string;
    closingDebit: string;
    closingCredit: string;
  };
  isBalanced: boolean;
  difference: string;
}

/**
 * Query params as they go on the wire. Declared here rather than derived from
 * the Zod schema: `z.coerce.number()` types its *input* as `unknown`, which is
 * true of an HTTP query string but useless to a caller.
 */
export interface DayBookParams {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  voucherType?: string;
}

export interface TrialBalanceParams {
  asOf?: string;
  from?: string;
  includeZero?: 'true' | 'false';
}

/** Blank filter fields must not be sent — the API validates `.min(1)` on them. */
function query(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params) as Array<[string, string | number | boolean | null | undefined]>) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

// ── chart of accounts ────────────────────────────────────────────────────────

export const fetchLedgerGroups = (signal?: AbortSignal) => apiClient.get<LedgerGroup[]>('/ledger-groups', signal);
export const fetchLedgers = (signal?: AbortSignal) => apiClient.get<Ledger[]>('/ledgers', signal);
export const fetchVoucherTypes = (signal?: AbortSignal) => apiClient.get<VoucherType[]>('/voucher-types', signal);
export const createLedger = (dto: CreateLedgerDto) => apiClient.post<Ledger>('/ledgers', dto);
export const updateLedger = (id: string, dto: UpdateLedgerDto) => apiClient.patch<Ledger>(`/ledgers/${id}`, dto);

// ── opening balances ─────────────────────────────────────────────────────────

export const fetchOpeningSummary = (signal?: AbortSignal) =>
  apiClient.get<OpeningBalanceSummary>('/opening-balances', signal);
export const setOpeningBalances = (dto: SetOpeningBalancesDto) =>
  apiClient.post<OpeningBalanceSummary>('/opening-balances', dto);

// ── vouchers ─────────────────────────────────────────────────────────────────

export const createVoucher = (dto: CreateVoucherDto) =>
  apiClient.post<{ voucher: Voucher; lines: VoucherLine[] }>('/vouchers', dto);
export const reverseVoucher = (id: string, dto: ReverseVoucherDto) =>
  apiClient.post<{ voucher: Voucher; lines: VoucherLine[] }>(`/vouchers/${id}/reverse`, dto);
export const fetchVoucher = (id: string, signal?: AbortSignal) =>
  apiClient.get<{ voucher: Voucher; lines: VoucherLine[]; voucherTypeCode: string }>(`/vouchers/${id}`, signal);

// ── the books ────────────────────────────────────────────────────────────────

export const fetchDayBook = (
  params: DayBookParams,
  signal?: AbortSignal,
): Promise<{ items: DayBookEntry[]; meta: PageMeta }> =>
  apiClient.getPaged<DayBookEntry>(`/reports/day-book${query(params)}`, signal);

export const fetchLedgerStatement = (ledgerId: string, params: { from?: string; to?: string }, signal?: AbortSignal) =>
  apiClient.get<LedgerStatement>(`/reports/ledgers/${ledgerId}${query(params)}`, signal);

export const fetchTrialBalance = (params: TrialBalanceParams, signal?: AbortSignal) =>
  apiClient.get<TrialBalance>(`/reports/trial-balance${query(params)}`, signal);
