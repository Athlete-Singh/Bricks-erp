import { z } from 'zod';
import { PRODUCTION_STAGES } from '../constants/domain';

export { PRODUCTION_STAGES };
export type { ProductionStage } from '../constants/domain';

const QUANTITY_PATTERN = /^\d{1,15}(\.\d{1,3})?$/;
const uuid = z.string().uuid('Invalid id');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

/**
 * A production count is a decimal string for the same reason stock is: it must
 * not pass through a float on the way to NUMERIC(18,3). Zero is allowed on
 * sorting (`broken_bricks`, `reject_bricks`), unlike a stock movement.
 */
const quantity = z
  .string()
  .regex(QUANTITY_PATTERN, 'Enter a quantity like 1000 or 12.500')
  .refine((v) => Number(v) > 0, 'Quantity must be more than zero');

const quantityOrZero = z
  .string()
  .regex(QUANTITY_PATTERN, 'Enter a quantity like 0 or 12.500')
  .refine((v) => Number(v) >= 0, 'Quantity cannot be negative');

/**
 * A chamber is a free text label (`Chamber 1`, `Khunta 3`). There is no
 * chamber master — DB_SCHEMA and GLOSSARY both treat it as a column, and the
 * same chamber may be reused across different batches on different dates.
 */
const chamber = z.string().min(1, 'Name the chamber').max(20, 'Keep it short');

export const PRODUCTION_BATCH_STATUSES = ['open', 'firing', 'sorted', 'closed'] as const;
export type ProductionBatchStatus = (typeof PRODUCTION_BATCH_STATUSES)[number];

/** PRD-02 — a batch is one chamber on one date in one kiln. */
export const productionBatchCreateSchema = z.object({
  siteId: uuid,
  chamber,
  batchDate: isoDate,
  notes: z.string().max(500).nullish(),
});
export type ProductionBatchCreateDto = z.infer<typeof productionBatchCreateSchema>;
export type ProductionBatchCreateInput = z.input<typeof productionBatchCreateSchema>;

export const productionBatchQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  siteId: uuid.optional(),
  chamber: z.string().max(20).optional(),
  status: z.enum(PRODUCTION_BATCH_STATUSES).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});
export type ProductionBatchQueryDto = z.infer<typeof productionBatchQuerySchema>;
export type ProductionBatchQueryInput = z.input<typeof productionBatchQuerySchema>;

/**
 * PRD-03 making — the Sardar's gang moulds green bricks. Sardar is optional
 * only because the parties catalogue may not have the right one on the day;
 * when LAB-01 lands this becomes a strict FK into labour_groups through its
 * Sardar party.
 */
export const productionMakingSchema = z.object({
  entryDate: isoDate,
  greenBricks: quantity,
  sardarPartyId: uuid.nullish(),
  notes: z.string().max(500).nullish(),
});
export type ProductionMakingDto = z.infer<typeof productionMakingSchema>;
export type ProductionMakingInput = z.input<typeof productionMakingSchema>;

/** PRD-03 drying — a date marker so the owner can see how long drying took. */
export const productionDryingSchema = z.object({
  entryDate: isoDate,
  notes: z.string().max(500).nullish(),
});
export type ProductionDryingDto = z.infer<typeof productionDryingSchema>;
export type ProductionDryingInput = z.input<typeof productionDryingSchema>;

/**
 * PRD-03 firing — the fired count may differ from the green count because
 * drying losses show up here. Fuel/coal consumption is PRD-04 and lands in
 * the next slice.
 */
export const productionFiringSchema = z.object({
  entryDate: isoDate,
  firedBricks: quantity,
  notes: z.string().max(500).nullish(),
});
export type ProductionFiringDto = z.infer<typeof productionFiringSchema>;
export type ProductionFiringInput = z.input<typeof productionFiringSchema>;

/**
 * PRD-03 sorting + PRD-05 — fired bricks are classified into saleable grades
 * and the rest counted as broken and rejects. The good grades enter finished
 * stock in the same transaction via `StockService`; broken and rejects are
 * counts only, since nothing was in stock yet to take out of.
 */
export const productionSortingOutputSchema = z.object({
  brickTypeId: uuid,
  quantity,
});
export type ProductionSortingOutputDto = z.infer<typeof productionSortingOutputSchema>;

export const productionSortingSchema = z.object({
  entryDate: isoDate,
  warehouseId: uuid,
  outputs: z.array(productionSortingOutputSchema).min(1, 'List at least one grade'),
  brokenBricks: quantityOrZero,
  rejectBricks: quantityOrZero,
  notes: z.string().max(500).nullish(),
});
export type ProductionSortingDto = z.infer<typeof productionSortingSchema>;
export type ProductionSortingInput = z.input<typeof productionSortingSchema>;

/**
 * LEK-01 — brick yield variance. Grouping is forced to one of three choices so
 * the "unexplained" column has a stable meaning: a batch, a chamber across
 * dates, or a Sardar gang's output.
 */
export const yieldVarianceQuerySchema = z.object({
  from: isoDate,
  to: isoDate,
  siteId: uuid.optional(),
  chamber: z.string().max(20).optional(),
  sardarPartyId: uuid.optional(),
  groupBy: z.enum(['batch', 'chamber', 'sardar']).default('batch'),
});
export type YieldVarianceQueryDto = z.infer<typeof yieldVarianceQuerySchema>;
export type YieldVarianceQueryInput = z.input<typeof yieldVarianceQuerySchema>;
