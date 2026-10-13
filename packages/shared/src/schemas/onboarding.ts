import { z } from 'zod';
import { ITEM_CATEGORIES, PARTY_TYPES } from '../constants/domain';

/**
 * ONB-01 — go-live import.
 *
 * A kiln moving onto BRICS brings four things: who it deals with, what it
 * stocks, what the books start at, and what is in the yard. Historical
 * transactions are explicitly out of scope (SOW §3) — the opening balances
 * stand in for everything before day one.
 *
 * The rows arrive as JSON, not as an uploaded file: the browser parses the CSV
 * and posts what it read. That keeps file handling out of the API entirely,
 * and it lets the person doing the import see every error against their own
 * spreadsheet before a single row is written.
 */

const money = z
  .string()
  .regex(/^-?\d+(\.\d{1,2})?$/, 'Use a number like 1500 or 1500.50')
  .default('0');

const quantity = z
  .string()
  .regex(/^\d+(\.\d{1,3})?$/, 'Use a number like 5000 or 5000.500')
  .refine((v) => Number(v) > 0, 'Must be more than zero');

const blank = (schema: z.ZodString) =>
  z
    .string()
    .transform((v) => v.trim())
    .pipe(schema.or(z.literal('')))
    .transform((v) => (v === '' ? null : v))
    .nullish();

const required = (label: string) =>
  z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().min(1, `${label} is required`));

export const ONBOARDING_KINDS = ['parties', 'items', 'opening-balances', 'opening-stock'] as const;
export type OnboardingKind = (typeof ONBOARDING_KINDS)[number];

/**
 * A party. `types` is one or more of the party types, comma-separated in the
 * sheet — a Sardar who also sells you coal is one party, not two.
 */
export const partyRowSchema = z.object({
  name: required('Name'),
  types: z
    .string()
    .transform((v) =>
      v
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    )
    .pipe(z.array(z.enum(PARTY_TYPES)).min(1, 'Give at least one type')),
  gstin: blank(z.string().length(15, 'GSTIN is 15 characters')),
  pan: blank(z.string().length(10, 'PAN is 10 characters')),
  stateCode: blank(z.string().length(2, 'State code is 2 digits, e.g. 09')),
  phone: blank(z.string().min(10, 'Phone is at least 10 digits')),
  email: blank(z.string().email('Not a valid email')),
  address: blank(z.string()),
  /** What they owed you, and what you owed them, on day one. */
  openingDebit: money,
  openingCredit: money,
});
export type PartyRow = z.infer<typeof partyRowSchema>;

/** An item. `unit` and `hsnCode` are matched by name against what already exists. */
export const itemRowSchema = z.object({
  name: required('Name'),
  category: z.enum(ITEM_CATEGORIES),
  unit: required('Unit'),
  hsnCode: blank(z.string().min(2)),
  /** Set when this item is a brick grade, and the grade is created with it (ADR-051). */
  brickGrade: blank(z.string().min(1)),
});
export type ItemRow = z.infer<typeof itemRowSchema>;

/** A ledger's opening balance, matched by ledger name or code. */
export const openingBalanceRowSchema = z
  .object({
    ledger: required('Ledger'),
    debit: money,
    credit: money,
  })
  .superRefine((row, ctx) => {
    const dr = Number(row.debit);
    const cr = Number(row.credit);
    if (dr > 0 && cr > 0) {
      ctx.addIssue({ code: 'custom', path: ['credit'], message: 'A ledger opens on one side, not both' });
    }
    if (dr === 0 && cr === 0) {
      ctx.addIssue({ code: 'custom', path: ['debit'], message: 'Give a debit or a credit' });
    }
  });
export type OpeningBalanceRow = z.infer<typeof openingBalanceRowSchema>;

/**
 * What is in the yard on day one. `item` is matched by name; a brick grade is
 * named by its own name, and resolves to the item it is stocked as (ADR-051).
 */
export const openingStockRowSchema = z.object({
  warehouse: required('Warehouse'),
  item: required('Item'),
  quantity,
  /** Defaults to the financial year's start if left blank. */
  asOf: blank(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')),
});
export type OpeningStockRow = z.infer<typeof openingStockRowSchema>;

/** One import, of one kind. Preview and commit take the same body. */
export const onboardingImportSchema = z.object({
  kind: z.enum(ONBOARDING_KINDS),
  rows: z.array(z.record(z.string(), z.string())).min(1, 'The file has no rows').max(2000, 'Import at most 2000 rows'),
});
export type OnboardingImportDto = z.infer<typeof onboardingImportSchema>;

/** What the preview says about one row, by its line number in the file. */
export interface OnboardingRowResult {
  line: number;
  ok: boolean;
  /** What will be created, in words, when `ok`. */
  summary: string;
  /** Why not, when it is not. One sentence per problem. */
  problems: string[];
}
