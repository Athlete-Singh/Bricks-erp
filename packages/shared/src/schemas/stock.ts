import { z } from 'zod';
import { STOCK_MOVEMENT_TYPES } from '../constants/domain';

/** Up to 15 digits and 3 decimals, matching NUMERIC(18,3). */
const QUANTITY_PATTERN = /^\d{1,15}(\.\d{1,3})?$/;

const uuid = z.string().uuid('Invalid id');

/**
 * A quantity is a decimal string for the same reason money is: it reaches the
 * database as NUMERIC and must not pass through a float on the way.
 */
const quantity = z
  .string()
  .regex(QUANTITY_PATTERN, 'Enter a quantity like 1000 or 12.500')
  .refine((v) => Number(v) > 0, 'Quantity must be more than zero');

/**
 * ADR-023 — a movement is about an item or a brick grade, never both and never
 * neither. Expressed as a refinement so the error names the problem rather than
 * failing on a missing field.
 */
function oneSubject<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.superRefine((value, ctx) => {
    const v = value as { itemId?: string | null; brickTypeId?: string | null };
    // A grade is stocked as its own item (ADR-051), so naming the grade is
    // enough and naming both is allowed — the service refuses them if they
    // disagree. Naming neither is still a movement about nothing.
    if (!v.itemId && !v.brickTypeId) {
      ctx.addIssue({ code: 'custom', path: ['itemId'], message: 'Choose an item or a brick grade' });
    }
  });
}

export const stockMovementTypeEnum = z.enum(STOCK_MOVEMENT_TYPES);

/** INV-03 — opening stock, the balance a kiln starts the financial year holding. */
export const openingStockSchema = oneSubject(
  z.object({
    warehouseId: uuid,
    itemId: uuid.nullish(),
    brickTypeId: uuid.nullish(),
    quantity,
    movementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
    notes: z.string().max(500).nullish(),
  }),
);
export type OpeningStockDto = z.infer<typeof openingStockSchema>;
export type OpeningStockInput = z.input<typeof openingStockSchema>;

/**
 * INV-06 — a manual correction. `reason` is required and has a floor, because
 * "adjustment" in the register tells nobody anything; this is the one movement
 * type that may take a balance negative (ADR-026), so it has to say why.
 */
export const stockAdjustmentSchema = oneSubject(
  z.object({
    warehouseId: uuid,
    itemId: uuid.nullish(),
    brickTypeId: uuid.nullish(),
    direction: z.enum(['in', 'out']),
    quantity,
    movementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
    reason: z.string().min(10, 'Say what happened, in a few words at least').max(500),
  }),
);
export type StockAdjustmentDto = z.infer<typeof stockAdjustmentSchema>;
export type StockAdjustmentInput = z.input<typeof stockAdjustmentSchema>;

export const stockMovementQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  warehouseId: uuid.optional(),
  itemId: uuid.optional(),
  brickTypeId: uuid.optional(),
  movementType: stockMovementTypeEnum.optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
export type StockMovementQueryDto = z.infer<typeof stockMovementQuerySchema>;
export type StockMovementQueryInput = z.input<typeof stockMovementQuerySchema>;

/**
 * INV-07 — current stock. `asOf` lets an owner ask what the yard held at a past
 * date, which is how a physical count on the 1st is reconciled on the 5th.
 */
export const currentStockQuerySchema = z.object({
  asOf: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
    .optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
    .optional(),
  siteId: uuid.optional(),
  warehouseId: uuid.optional(),
  /** `item`, `brick` or both — a storekeeper and an owner want different halves. */
  subject: z.enum(['item', 'brick', 'all']).default('all'),
  /**
   * Keep subjects whose movements net to zero. The report is built from the
   * ledger, so an item that has never moved at all has no row either way —
   * this only decides whether a subject that moved and came back to zero is
   * shown or hidden.
   */
  includeZero: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});
export type CurrentStockQueryDto = z.infer<typeof currentStockQuerySchema>;
export type CurrentStockQueryInput = z.input<typeof currentStockQuerySchema>;
