export const PARTY_TYPES = ['customer', 'supplier', 'sardar', 'transporter', 'employee', 'other'] as const;
export type PartyType = (typeof PARTY_TYPES)[number];

export const SITE_TYPES = ['kiln', 'branch', 'depot'] as const;
export type SiteType = (typeof SITE_TYPES)[number];

export const VOUCHER_TYPES = {
  receipt: 'RCT',
  payment: 'PMT',
  contra: 'CNT',
  journal: 'JNL',
  sales: 'SAL',
  purchase: 'PUR',
  credit_note: 'CRN',
  debit_note: 'DBN',
} as const;
export type VoucherType = keyof typeof VOUCHER_TYPES;

export const GST_SCHEMES = ['regular_12_itc', 'composition_6_no_itc'] as const;
export type GstScheme = (typeof GST_SCHEMES)[number];

export const PAYMENT_MODES = ['cash', 'bank', 'upi', 'credit'] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

/**
 * Production stages, in physical order. One stage entry per batch per stage;
 * `soil` is not a stage — it is raw material consumed at `making` (PRD-04).
 */
export const PRODUCTION_STAGES = ['making', 'drying', 'firing', 'sorting'] as const;
export type ProductionStage = (typeof PRODUCTION_STAGES)[number];

export const ITEM_CATEGORIES = ['raw_material', 'consumable', 'machinery', 'electrical', 'repair', 'other'] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

/** Brick prices and wages are quoted per 1,000 bricks. */
export const BRICKS_PER_RATE_UNIT = 1000;

export const API_PREFIX = 'api/v1';

/**
 * Why a quantity moved. Opening and adjustment are entered by a person; the
 * rest are written by the module that caused them (P5 production, P7 purchases,
 * P9 dispatch), which is what makes `Opening + In − Out = Closing` explainable
 * line by line rather than just arithmetically true.
 */
export const STOCK_MOVEMENT_TYPES = [
  'opening',
  'purchase',
  'production',
  'sale',
  'wastage',
  'adjustment',
  'transfer',
] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

/** Movement types a person may enter directly; everything else needs a source document. */
export const MANUAL_STOCK_MOVEMENT_TYPES = ['opening', 'adjustment'] as const;

/** Quantities allow three decimals — coal is weighed in tonnes, bricks counted in pieces. */
export const QUANTITY_SCALE = 3;
