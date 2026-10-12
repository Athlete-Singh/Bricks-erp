import { z } from 'zod';

const AMOUNT_PATTERN = /^\d{1,16}(\.\d{1,2})?$/;

const uuid = z.string().uuid('Invalid id');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

const money = z
  .string()
  .regex(AMOUNT_PATTERN, 'Enter an amount like 1250.00')
  .refine((v) => Number(v) > 0, 'Amount must be more than zero');

/**
 * How an expense was settled. `cash`, `bank` and `upi` all name a ledger the
 * money left — the mode is what the owner recognises, the ledger is what the
 * books believe. `credit` means nothing left yet and a party is owed.
 */
export const EXPENSE_PAYMENT_MODES = ['cash', 'bank', 'upi', 'credit'] as const;
export type ExpensePaymentMode = (typeof EXPENSE_PAYMENT_MODES)[number];

/** What the money left by, when it matters for reconciling a bank statement. */
export const INSTRUMENT_TYPES = ['cheque', 'upi', 'neft', 'rtgs', 'imps', 'card', 'cash'] as const;
export type InstrumentType = (typeof INSTRUMENT_TYPES)[number];

// ── EXP-02 expense entry ─────────────────────────────────────────────────────

export const createExpenseSchema = z
  .object({
    siteId: uuid,
    /** The expense ledger this lands on — an EXP-01 category. */
    categoryLedgerId: uuid,
    expenseDate: isoDate,
    amount: money,
    mode: z.enum(EXPENSE_PAYMENT_MODES),
    /** The cash or bank ledger the money left. Not used when on credit. */
    paidFromLedgerId: uuid.nullish(),
    /** Who is owed, when the charge is on credit. */
    partyId: uuid.nullish(),
    instrumentType: z.enum(INSTRUMENT_TYPES).nullish(),
    /** Cheque number, UPI reference, NEFT UTR — whatever identifies the payment. */
    instrumentRef: z.string().max(80).nullish(),
    description: z.string().max(500).nullish(),
    notes: z.string().max(1000).nullish(),
  })
  .superRefine((value, ctx) => {
    if (value.mode === 'credit') {
      if (!value.partyId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['partyId'],
          message: 'Say who is owed for this',
        });
      }
      if (value.paidFromLedgerId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['paidFromLedgerId'],
          message: 'Nothing has been paid yet — leave the account blank',
        });
      }
      return;
    }

    if (!value.paidFromLedgerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['paidFromLedgerId'],
        message: 'Say which account the money left',
      });
    }
    if (value.partyId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['partyId'],
        message: 'A paid expense owes nobody — leave the party blank',
      });
    }
  });
export type CreateExpenseDto = z.infer<typeof createExpenseSchema>;
export type CreateExpenseInput = z.input<typeof createExpenseSchema>;

export const expenseQuerySchema = z.object({
  siteId: uuid.optional(),
  categoryLedgerId: uuid.optional(),
  mode: z.enum(EXPENSE_PAYMENT_MODES).optional(),
  partyId: uuid.optional(),
  fromDate: isoDate.optional(),
  toDate: isoDate.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type ExpenseQueryDto = z.infer<typeof expenseQuerySchema>;

// ── ACC-07 cash book / bank book ─────────────────────────────────────────────

/**
 * Opening, every movement, and closing — for one account or for all the cash
 * (or all the bank) accounts at once, which is how an owner actually asks
 * "how much cash did we have and where did it go".
 */
export const cashBookQuerySchema = z.object({
  fromDate: isoDate,
  toDate: isoDate,
  /** One account; omitted means every account of that kind. */
  ledgerId: uuid.optional(),
  siteId: uuid.optional(),
});
export type CashBookQueryDto = z.infer<typeof cashBookQuerySchema>;
