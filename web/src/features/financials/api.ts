import { apiClient } from '@/lib/api-client';
import type { CreateExpenseInput, ExpensePaymentMode, SetClosingStockRatesInput } from '@brics/shared';

function query<T extends object>(params: T): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params) as [string, unknown][]) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

// ── types ─────────────────────────────────────────────────────────────────────

export interface ExpenseCategory {
  id: string;
  name: string;
  code: string | null;
  kind: 'direct' | 'indirect';
}

export interface Expense {
  id: string;
  expenseNo: string;
  siteId: string;
  categoryLedgerId: string;
  expenseDate: string;
  amount: string;
  mode: ExpensePaymentMode;
  paidFromLedgerId: string | null;
  partyId: string | null;
  instrumentType: string | null;
  instrumentRef: string | null;
  voucherId: string;
  description: string | null;
}

export interface BookEntry {
  voucherId: string;
  number: string;
  date: string;
  voucherType: string;
  narration: string | null;
  instrumentType: string | null;
  instrumentRef: string | null;
  counterparty: string | null;
  moneyIn: string;
  moneyOut: string;
  balance: string;
}

export interface BookAccount {
  ledgerId: string;
  ledgerName: string;
  opening: string;
  moneyIn: string;
  moneyOut: string;
  closing: string;
  entries: BookEntry[];
}

export interface BookMeta {
  kind: 'cash' | 'bank';
  fromDate: string;
  toDate: string;
  accountCount: number;
  opening: string;
  moneyIn: string;
  moneyOut: string;
  closing: string;
}

export interface ClosingStockItem {
  itemId: string;
  itemName: string;
  quantity: string;
  rate: string | null;
  value: string | null;
  unvalued: boolean;
}

export interface ClosingStockMeta {
  asOf: string;
  itemCount: number;
  valuedCount: number;
  unvaluedCount: number;
  totalValue: string;
}

export interface PnlLine {
  ledgerId: string;
  ledgerName: string;
  ledgerCode: string | null;
  groupName: string;
  amount: string;
}

export interface ProfitAndLoss {
  fromDate: string;
  toDate: string;
  directIncome: PnlLine[];
  directExpenses: PnlLine[];
  indirectIncome: PnlLine[];
  indirectExpenses: PnlLine[];
  openingStock: { value: string; unvaluedCount: number } | null;
  closingStock: { value: string; unvaluedCount: number } | null;
  totals: {
    directIncome: string;
    directExpenses: string;
    indirectIncome: string;
    indirectExpenses: string;
    grossProfit: string;
    netProfit: string;
  };
  unvaluedStockGrades: number;
}

export interface BalanceSheetGroup {
  groupCode: string;
  groupName: string;
  lines: { ledgerName: string; amount: string }[];
  total: string;
}

export interface BalanceSheet {
  asOf: string;
  assets: BalanceSheetGroup[];
  liabilities: BalanceSheetGroup[];
  closingStock: { value: string; unvaluedCount: number };
  retainedEarnings: string;
  totals: { assets: string; liabilities: string; difference: string };
  unvaluedStockGrades: number;
}

export interface PartyBalance {
  partyId: string;
  name: string;
  partyTypes: string[];
  receivable: string;
  payable: string;
  net: string;
}

export interface GstrLine {
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  gstin: string | null;
  stateCode: string | null;
  taxableAmount: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  totalAmount: string;
}

export interface Gstr1 {
  month: string;
  b2b: GstrLine[];
  b2c: GstrLine[];
  hsnSummary: {
    hsnCode: string;
    description: string;
    quantity: string;
    taxableAmount: string;
    cgstAmount: string;
    sgstAmount: string;
    igstAmount: string;
  }[];
  creditNotes: { noteNo: string; noteDate: string; customerName: string; taxAmount: string }[];
  totals: {
    b2bCount: number;
    b2cCount: number;
    taxableAmount: string;
    cgstAmount: string;
    sgstAmount: string;
    igstAmount: string;
    creditNoteTax: string;
  };
}

export interface Gstr3b {
  month: string;
  outwardSupplies: { taxableAmount: string; cgstAmount: string; sgstAmount: string; igstAmount: string };
  inwardSupplies: { taxableAmount: string; cgstAmount: string; sgstAmount: string; igstAmount: string };
  totals: { outputTax: string; inputCredit: string; netPayable: string };
}

export interface GstReconLine {
  label: string;
  perRegister: string;
  perBooks: string;
  difference: string;
  matches: boolean;
}

export interface GstReconMeta {
  month: string;
  mismatchCount: number;
  invoicesMissingHsn: number;
  missingHsnTaxable: string;
  clean: boolean;
}

// ── expenses ──────────────────────────────────────────────────────────────────

export const fetchExpenseCategories = (signal?: AbortSignal) =>
  apiClient.get<ExpenseCategory[]>('/expenses/categories', signal);

export const fetchExpenses = (
  params: { fromDate?: string; toDate?: string; categoryLedgerId?: string; siteId?: string; limit?: number } = {},
  signal?: AbortSignal,
) => apiClient.getPaged<Expense>(`/expenses${query(params)}`, signal);

export const createExpense = (dto: CreateExpenseInput) => apiClient.post<Expense>('/expenses', dto);

// ── cash & bank ───────────────────────────────────────────────────────────────

export const fetchBook = (
  kind: 'cash' | 'bank',
  params: { fromDate: string; toDate: string; ledgerId?: string; siteId?: string },
  signal?: AbortSignal,
) => apiClient.getWithMeta<BookAccount, BookMeta>(`/reports/${kind}-book${query(params)}`, signal);

// ── statements ────────────────────────────────────────────────────────────────

export const fetchClosingStock = (params: { asOf: string; siteId?: string }, signal?: AbortSignal) =>
  apiClient.getWithMeta<ClosingStockItem, ClosingStockMeta>(`/reports/closing-stock${query(params)}`, signal);

export const setClosingStockRates = (dto: SetClosingStockRatesInput) =>
  apiClient.post<ClosingStockItem[]>('/reports/closing-stock/rates', dto);

export const fetchProfitAndLoss = (
  params: { fromDate: string; toDate: string; siteId?: string },
  signal?: AbortSignal,
) => apiClient.getWithMeta<never, ProfitAndLoss>(`/reports/profit-and-loss${query(params)}`, signal);

export const fetchBalanceSheet = (params: { asOf: string; siteId?: string }, signal?: AbortSignal) =>
  apiClient.getWithMeta<never, BalanceSheet>(`/reports/balance-sheet${query(params)}`, signal);

export const fetchPartyBalances = (
  params: { asOf: string; partyType?: 'customer' | 'supplier'; includeSettled?: boolean },
  signal?: AbortSignal,
) =>
  apiClient.getWithMeta<PartyBalance, { asOf: string; partyCount: number; receivable: string; payable: string }>(
    `/reports/party-balances${query(params)}`,
    signal,
  );

// ── GST ───────────────────────────────────────────────────────────────────────

export const fetchGstr1 = (params: { month: string; siteId?: string }, signal?: AbortSignal) =>
  apiClient.getWithMeta<never, Gstr1>(`/gst/gstr-1${query(params)}`, signal);

export const fetchGstr3b = (params: { month: string; siteId?: string }, signal?: AbortSignal) =>
  apiClient.getWithMeta<never, Gstr3b>(`/gst/gstr-3b${query(params)}`, signal);

export const fetchGstReconciliation = (params: { month: string; siteId?: string }, signal?: AbortSignal) =>
  apiClient.getWithMeta<GstReconLine, GstReconMeta>(`/gst/reconciliation${query(params)}`, signal);

/**
 * GST-04's export. Fetched with the in-memory Bearer token (ADR-016) and handed
 * back as an object URL — the viewer cannot download from a plain link.
 */
export async function fetchGstr1CsvObjectUrl(month: string): Promise<string> {
  const blob = await apiClient.getBlob(`/gst/gstr-1/export?month=${encodeURIComponent(month)}`);
  return URL.createObjectURL(blob);
}
