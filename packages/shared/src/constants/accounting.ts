/**
 * The seeded chart of accounts (ACC-01).
 *
 * Tally-style groups, because that is what Indian accountants and CAs expect to
 * see — OPEN_QUESTIONS #3, answered with this default. Every company gets its
 * own copy at creation, so an owner can rename or extend it without touching
 * anyone else's books.
 */

/** Which side a group's balance normally sits on, and which statement it lands in. */
export const LEDGER_NATURES = ['asset', 'liability', 'income', 'expense'] as const;
export type LedgerNature = (typeof LEDGER_NATURES)[number];

/** Assets and expenses increase on the debit side; liabilities and income on the credit side. */
export function normalBalanceSide(nature: LedgerNature): 'debit' | 'credit' {
  return nature === 'asset' || nature === 'expense' ? 'debit' : 'credit';
}

export function belongsToBalanceSheet(nature: LedgerNature): boolean {
  return nature === 'asset' || nature === 'liability';
}

export interface LedgerGroupSeed {
  code: string;
  name: string;
  nature: LedgerNature;
  /** Parent group code; `null` for a top-level group. */
  parent: string | null;
  /**
   * Counts towards gross profit (the trading account) rather than net profit.
   * Sales, purchases, direct income and direct expenses are direct; overheads
   * are not. Needed by the P&L in P10.
   */
  isDirect?: boolean;
}

/** Group tree. Order matters: a parent is always listed before its children. */
export const LEDGER_GROUP_SEED: readonly LedgerGroupSeed[] = [
  // ── Liabilities ───────────────────────────────────────────────────────────
  { code: 'CAPITAL', name: 'Capital Account', nature: 'liability', parent: null },
  { code: 'RESERVES', name: 'Reserves & Surplus', nature: 'liability', parent: null },
  { code: 'LOANS_LIABILITY', name: 'Loans (Liability)', nature: 'liability', parent: null },
  { code: 'CURRENT_LIABILITIES', name: 'Current Liabilities', nature: 'liability', parent: null },
  { code: 'SUNDRY_CREDITORS', name: 'Sundry Creditors', nature: 'liability', parent: 'CURRENT_LIABILITIES' },
  { code: 'LABOUR_PAYABLES', name: 'Labour Payables', nature: 'liability', parent: 'CURRENT_LIABILITIES' },
  { code: 'DUTIES_TAXES', name: 'Duties & Taxes', nature: 'liability', parent: 'CURRENT_LIABILITIES' },
  { code: 'SUSPENSE', name: 'Suspense Account', nature: 'liability', parent: null },

  // ── Assets ────────────────────────────────────────────────────────────────
  { code: 'FIXED_ASSETS', name: 'Fixed Assets', nature: 'asset', parent: null },
  { code: 'CURRENT_ASSETS', name: 'Current Assets', nature: 'asset', parent: null },
  { code: 'CASH_IN_HAND', name: 'Cash-in-hand', nature: 'asset', parent: 'CURRENT_ASSETS' },
  { code: 'BANK_ACCOUNTS', name: 'Bank Accounts', nature: 'asset', parent: 'CURRENT_ASSETS' },
  { code: 'SUNDRY_DEBTORS', name: 'Sundry Debtors', nature: 'asset', parent: 'CURRENT_ASSETS' },
  { code: 'LABOUR_ADVANCES', name: 'Labour Advances', nature: 'asset', parent: 'CURRENT_ASSETS' },
  { code: 'STOCK_IN_HAND', name: 'Stock-in-hand', nature: 'asset', parent: 'CURRENT_ASSETS' },
  { code: 'DEPOSITS', name: 'Deposits', nature: 'asset', parent: 'CURRENT_ASSETS' },

  // ── Income ────────────────────────────────────────────────────────────────
  { code: 'SALES_ACCOUNTS', name: 'Sales Accounts', nature: 'income', parent: null, isDirect: true },
  { code: 'DIRECT_INCOME', name: 'Direct Income', nature: 'income', parent: null, isDirect: true },
  { code: 'INDIRECT_INCOME', name: 'Indirect Income', nature: 'income', parent: null },

  // ── Expenses ──────────────────────────────────────────────────────────────
  { code: 'PURCHASE_ACCOUNTS', name: 'Purchase Accounts', nature: 'expense', parent: null, isDirect: true },
  { code: 'DIRECT_EXPENSES', name: 'Direct Expenses', nature: 'expense', parent: null, isDirect: true },
  { code: 'INDIRECT_EXPENSES', name: 'Indirect Expenses', nature: 'expense', parent: null },
] as const;

export interface LedgerSeed {
  code: string;
  name: string;
  group: string;
}

/**
 * Ledgers every brick kiln needs on day one. Named after the cost lines in the
 * client's own cost-per-1,000 table (Proposal §4 / Functional Spec §22), so the
 * books and the costing report speak the same language.
 *
 * Party ledgers are **not** here: each party gets one automatically in P3.
 */
export const LEDGER_SEED: readonly LedgerSeed[] = [
  { code: 'CASH', name: 'Cash', group: 'CASH_IN_HAND' },

  // GST — split by place of supply at posting time (ACCOUNTING_RULES).
  { code: 'OUTPUT_CGST', name: 'Output CGST', group: 'DUTIES_TAXES' },
  { code: 'OUTPUT_SGST', name: 'Output SGST', group: 'DUTIES_TAXES' },
  { code: 'OUTPUT_IGST', name: 'Output IGST', group: 'DUTIES_TAXES' },
  { code: 'INPUT_CGST', name: 'Input CGST', group: 'DUTIES_TAXES' },
  { code: 'INPUT_SGST', name: 'Input SGST', group: 'DUTIES_TAXES' },
  { code: 'INPUT_IGST', name: 'Input IGST', group: 'DUTIES_TAXES' },

  { code: 'SALES_BRICKS', name: 'Sales — Bricks', group: 'SALES_ACCOUNTS' },
  { code: 'SALES_RETURNS', name: 'Sales Returns', group: 'SALES_ACCOUNTS' },
  { code: 'FREIGHT_INCOME', name: 'Freight Income', group: 'DIRECT_INCOME' },
  // Billed on sales invoices alongside bricks (OQ #17). Separate ledgers so the
  // P&L shows loading and other charge income on their own lines.
  { code: 'LOADING_INCOME', name: 'Loading Income', group: 'DIRECT_INCOME' },
  { code: 'OTHER_SALES_INCOME', name: 'Other Sales Income', group: 'DIRECT_INCOME' },

  { code: 'PURCHASES_RAW_MATERIAL', name: 'Purchases — Raw Material', group: 'PURCHASE_ACCOUNTS' },

  // Direct expenses — the cost-per-1,000 lines.
  { code: 'LABOUR_WAGES', name: 'Labour Wages', group: 'DIRECT_EXPENSES' },
  { code: 'COAL', name: 'Coal', group: 'DIRECT_EXPENSES' },
  { code: 'SOIL', name: 'Soil', group: 'DIRECT_EXPENSES' },
  { code: 'ELECTRICITY', name: 'Electricity & Power', group: 'DIRECT_EXPENSES' },
  { code: 'LOADING_UNLOADING', name: 'Loading & Unloading', group: 'DIRECT_EXPENSES' },
  { code: 'FREIGHT_EXPENSE', name: 'Freight Expense', group: 'DIRECT_EXPENSES' },
  { code: 'VEHICLE_DIESEL', name: 'Vehicle Diesel', group: 'DIRECT_EXPENSES' },

  // Overheads.
  { code: 'REPAIRS_MAINTENANCE', name: 'Repairs & Maintenance', group: 'INDIRECT_EXPENSES' },
  { code: 'VEHICLE_REPAIRS', name: 'Vehicle Repairs', group: 'INDIRECT_EXPENSES' },
  { code: 'SALARY', name: 'Salary', group: 'INDIRECT_EXPENSES' },
  { code: 'RENT', name: 'Rent', group: 'INDIRECT_EXPENSES' },
  { code: 'OFFICE_EXPENSES', name: 'Office Expenses', group: 'INDIRECT_EXPENSES' },
  { code: 'BANK_CHARGES', name: 'Bank Charges', group: 'INDIRECT_EXPENSES' },
  { code: 'GOVERNMENT_CHARGES', name: 'Government Charges', group: 'INDIRECT_EXPENSES' },
  { code: 'MISC_EXPENSES', name: 'Miscellaneous Expenses', group: 'INDIRECT_EXPENSES' },
  // EXP-01 names machinery and food as their own categories; neither had a
  // ledger before P10, so an expense entry had nowhere honest to land.
  { code: 'MACHINERY_REPAIRS', name: 'Machinery & Equipment', group: 'INDIRECT_EXPENSES' },
  { code: 'FOOD_EXPENSES', name: 'Food & Khurak', group: 'INDIRECT_EXPENSES' },

  { code: 'CLOSING_STOCK', name: 'Closing Stock', group: 'STOCK_IN_HAND' },

  /**
   * Opening balances rarely balance on the first try. The difference parks here
   * so the trial balance still ties, and the owner can see what is unexplained
   * instead of the system silently swallowing it.
   */
  { code: 'OPENING_DIFFERENCE', name: 'Opening Balance Difference', group: 'SUSPENSE' },
] as const;

export interface VoucherTypeSeed {
  code: string;
  name: string;
  /** Goes into the voucher number: `SAL/2026-27/000123`. */
  prefix: string;
}

/** The eight voucher types from ACCOUNTING_RULES. */
export const VOUCHER_TYPE_SEED: readonly VoucherTypeSeed[] = [
  { code: 'receipt', name: 'Receipt', prefix: 'RCT' },
  { code: 'payment', name: 'Payment', prefix: 'PMT' },
  { code: 'contra', name: 'Contra', prefix: 'CNT' },
  { code: 'journal', name: 'Journal', prefix: 'JNL' },
  { code: 'sales', name: 'Sales', prefix: 'SAL' },
  { code: 'purchase', name: 'Purchase', prefix: 'PUR' },
  { code: 'credit_note', name: 'Credit Note', prefix: 'CRN' },
  { code: 'debit_note', name: 'Debit Note', prefix: 'DBN' },
] as const;
