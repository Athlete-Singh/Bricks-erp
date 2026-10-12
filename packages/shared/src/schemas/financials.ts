import { z } from 'zod';

const AMOUNT_PATTERN = /^\d{1,16}(\.\d{1,2})?$/;

const uuid = z.string().uuid('Invalid id');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

const money = z
  .string()
  .regex(AMOUNT_PATTERN, 'Enter an amount like 1250.00')
  .refine((v) => Number(v) > 0, 'Amount must be more than zero');

// ── closing stock valuation (OQ #4) ──────────────────────────────────────────

/**
 * A rate per grade, entered at period end. The quantity is never typed — it
 * comes from the stock ledger as at that date, so the valuation cannot disagree
 * with the stock register.
 */
export const setClosingStockRatesSchema = z.object({
  asOf: isoDate,
  rates: z
    .array(
      z.object({
        itemId: uuid,
        /** Per unit of the item — per brick, per tonne of coal. */
        rate: money,
      }),
    )
    .min(1, 'Enter a rate for at least one grade'),
});
export type SetClosingStockRatesDto = z.infer<typeof setClosingStockRatesSchema>;
export type SetClosingStockRatesInput = z.input<typeof setClosingStockRatesSchema>;

export const closingStockQuerySchema = z.object({
  asOf: isoDate,
  siteId: uuid.optional(),
});
export type ClosingStockQueryDto = z.infer<typeof closingStockQuerySchema>;

// ── ACC-08 Profit & Loss and Balance Sheet ───────────────────────────────────

export const profitAndLossQuerySchema = z.object({
  fromDate: isoDate,
  toDate: isoDate,
  siteId: uuid.optional(),
  /**
   * Opening stock at the start of the window. Closing stock is read from the
   * rates entered for `toDate`; the opening side needs the rates entered for
   * the day before `fromDate`, and is simply absent when nobody entered them.
   */
  includeStock: z.coerce.boolean().default(true),
});
export type ProfitAndLossQueryDto = z.infer<typeof profitAndLossQuerySchema>;

export const balanceSheetQuerySchema = z.object({
  asOf: isoDate,
  siteId: uuid.optional(),
});
export type BalanceSheetQueryDto = z.infer<typeof balanceSheetQuerySchema>;

// ── ACC-09 receivables & payables summary ────────────────────────────────────

export const partyBalancesQuerySchema = z.object({
  asOf: isoDate,
  /** `customer` for receivables, `supplier` for payables, omitted for both. */
  partyType: z.enum(['customer', 'supplier']).optional(),
  /** Hide parties who are square — the default, since a zero is not news. */
  includeSettled: z.coerce.boolean().default(false),
});
export type PartyBalancesQueryDto = z.infer<typeof partyBalancesQuerySchema>;

// ── ACC-10 financial year lock and carry-forward ─────────────────────────────

export const closeFinancialYearSchema = z.object({
  /** The year being closed. Its balances are carried into the next one. */
  financialYearId: uuid,
  /** Where the balances land. Must start the day after the closing year ends. */
  nextFinancialYearId: uuid,
  confirm: z.literal(true, { message: 'Closing a year is not reversible from the app — confirm it' }),
});
export type CloseFinancialYearDto = z.infer<typeof closeFinancialYearSchema>;
export type CloseFinancialYearInput = z.input<typeof closeFinancialYearSchema>;
