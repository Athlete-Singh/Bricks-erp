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

export const PAYMENT_MODES = ['cash', 'bank', 'upi', 'credit'] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

/** Production stages, in physical order. */
export const PRODUCTION_STAGES = ['soil', 'brick_making', 'drying', 'firing', 'sorting'] as const;
export type ProductionStage = (typeof PRODUCTION_STAGES)[number];

/** Brick prices and wages are quoted per 1,000 bricks. */
export const BRICKS_PER_RATE_UNIT = 1000;

export const API_PREFIX = 'api/v1';
