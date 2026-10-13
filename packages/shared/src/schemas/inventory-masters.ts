import { z } from 'zod';
import { ITEM_CATEGORIES } from '../constants/domain';

function blankToNull<T extends z.ZodType<string>>(schema: T) {
  return z
    .union([z.literal(''), schema, z.null()])
    .optional()
    .transform((value) => (value === '' ? null : value));
}

// ── Units ────────────────────────────────────────────────────────────────────

export const createUnitSchema = z.object({
  name: z.string().min(2, 'Unit name is required'),
  abbreviation: z.string().min(1, 'Abbreviation is required').max(10, 'Too long'),
});
export type CreateUnitDto = z.infer<typeof createUnitSchema>;
export type CreateUnitInput = z.input<typeof createUnitSchema>;

export const updateUnitSchema = z.object({
  name: z.string().min(2).optional(),
  abbreviation: z.string().min(1).max(10).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateUnitDto = z.infer<typeof updateUnitSchema>;
export type UpdateUnitInput = z.input<typeof updateUnitSchema>;

// ── Brick Types ─────────────────────────────────────────────────────────────

export const createBrickTypeSchema = z.object({
  grade: z.string().min(1, 'Grade name is required'),
  /**
   * The item this grade is stocked and sold as (ADR-051). Required, and never
   * changed afterwards — moving a grade to a different item would split its
   * stock history across two piles, so `updateBrickTypeSchema` does not take it.
   */
  itemId: z.string().uuid('Invalid item ID'),
  description: blankToNull(z.string()),
});
export type CreateBrickTypeDto = z.infer<typeof createBrickTypeSchema>;
export type CreateBrickTypeInput = z.input<typeof createBrickTypeSchema>;

export const updateBrickTypeSchema = z.object({
  grade: z.string().min(1).optional(),
  description: blankToNull(z.string()),
  isActive: z.boolean().optional(),
});
export type UpdateBrickTypeDto = z.infer<typeof updateBrickTypeSchema>;
export type UpdateBrickTypeInput = z.input<typeof updateBrickTypeSchema>;

// ── Warehouses ──────────────────────────────────────────────────────────────

export const createWarehouseSchema = z.object({
  siteId: z.string().uuid('Invalid site ID'),
  name: z.string().min(2, 'Warehouse name is required'),
});
export type CreateWarehouseDto = z.infer<typeof createWarehouseSchema>;
export type CreateWarehouseInput = z.input<typeof createWarehouseSchema>;

export const updateWarehouseSchema = z.object({
  name: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateWarehouseDto = z.infer<typeof updateWarehouseSchema>;
export type UpdateWarehouseInput = z.input<typeof updateWarehouseSchema>;

// ── Items ───────────────────────────────────────────────────────────────────

export const itemCategoryEnum = z.enum(ITEM_CATEGORIES);

export const createItemSchema = z.object({
  name: z.string().min(2, 'Item name is required'),
  category: itemCategoryEnum,
  unitId: z.string().uuid('Invalid unit ID'),
  hsnId: blankToNull(z.string().uuid('Invalid HSN ID')), // Nullable until P3.1c
});
export type CreateItemDto = z.infer<typeof createItemSchema>;
export type CreateItemInput = z.input<typeof createItemSchema>;

export const updateItemSchema = z.object({
  name: z.string().min(2).optional(),
  category: itemCategoryEnum.optional(),
  unitId: z.string().uuid().optional(),
  hsnId: blankToNull(z.string().uuid()),
  isActive: z.boolean().optional(),
});
export type UpdateItemDto = z.infer<typeof updateItemSchema>;
export type UpdateItemInput = z.input<typeof updateItemSchema>;

// ── Common Query ────────────────────────────────────────────────────────────

export const inventoryMasterQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  search: z.string().min(1).optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  sort: z.string().optional().default('-created_at'),
  /**
   * SYN-02 — delta pull. Only rows whose `updated_at` or `deleted_at` is
   * strictly after this ISO instant are returned, with deleted rows carrying
   * `deleted: true` so the mobile reconciles its local store.
   */
  since: z.string().datetime({ offset: true }).optional(),
});
export type InventoryMasterQueryDto = z.infer<typeof inventoryMasterQuerySchema>;

/** The same shape, named for use by every master list — transport, taxes, labour. */
export const masterQuerySchema = inventoryMasterQuerySchema;
export type MasterQueryDto = InventoryMasterQueryDto;
