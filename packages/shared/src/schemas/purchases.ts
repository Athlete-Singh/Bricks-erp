import { z } from 'zod';

const AMOUNT_PATTERN = /^\d{1,16}(\.\d{1,2})?$/;
const QUANTITY_PATTERN = /^\d{1,15}(\.\d{1,3})?$/;
const RATE_PATTERN = /^\d{1,3}(\.\d{1,2})?$/;

const uuid = z.string().uuid('Invalid id');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

/** Money is a decimal string end to end — never a float (CONVENTIONS). */
const money = z
  .string()
  .regex(AMOUNT_PATTERN, 'Enter an amount like 1250.00')
  .refine((v) => Number(v) > 0, 'Amount must be more than zero');

const quantity = z
  .string()
  .regex(QUANTITY_PATTERN, 'Enter a quantity like 100 or 12.500')
  .refine((v) => Number(v) > 0, 'Quantity must be more than zero');

/** A GST percentage, normalised to two decimals like the HSN master (ADR-022). */
const gstRate = z
  .string()
  .regex(RATE_PATTERN, 'Enter a rate like 6 or 2.50')
  .refine((v) => Number(v) <= 100, 'Rate cannot exceed 100')
  .transform((v) => Number(v).toFixed(2))
  .default('0.00');

export const PURCHASE_ORDER_STATUSES = ['open', 'partial', 'received', 'cancelled'] as const;
export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export const PURCHASE_PAYMENT_MODES = ['cash', 'bank', 'upi'] as const;
export type PurchasePaymentMode = (typeof PURCHASE_PAYMENT_MODES)[number];

// ── PUR-01 purchase order ────────────────────────────────────────────────────

export const purchaseOrderLineSchema = z.object({
  itemId: uuid,
  quantity,
  /** Agreed rate per unit. Indicative only — the bill is what the books believe. */
  rate: money,
});
export type PurchaseOrderLineDto = z.infer<typeof purchaseOrderLineSchema>;

export const createPurchaseOrderSchema = z.object({
  supplierPartyId: uuid,
  siteId: uuid,
  orderDate: isoDate,
  expectedDate: isoDate.nullish(),
  lines: z.array(purchaseOrderLineSchema).min(1, 'A purchase order needs at least one line'),
  notes: z.string().max(500).nullish(),
});
export type CreatePurchaseOrderDto = z.infer<typeof createPurchaseOrderSchema>;
export type CreatePurchaseOrderInput = z.input<typeof createPurchaseOrderSchema>;

// ── PUR-02 goods receipt ─────────────────────────────────────────────────────

export const grnLineSchema = z.object({
  itemId: uuid,
  quantity,
  /** Where the goods physically landed — drives the stock IN. */
  warehouseId: uuid,
});
export type GrnLineDto = z.infer<typeof grnLineSchema>;

/**
 * A receipt moves **quantity only**. Value enters with the bill, which
 * ACCOUNTING_RULES is explicit about — so there is no rate here, and a GRN
 * posts no journal.
 */
export const createGrnSchema = z.object({
  supplierPartyId: uuid,
  siteId: uuid,
  purchaseOrderId: uuid.nullish(),
  receiptDate: isoDate,
  /** The supplier's own challan number, for reconciling at the gate. */
  challanNo: z.string().max(50).nullish(),
  lines: z.array(grnLineSchema).min(1, 'A goods receipt needs at least one line'),
  notes: z.string().max(500).nullish(),
});
export type CreateGrnDto = z.infer<typeof createGrnSchema>;
export type CreateGrnInput = z.input<typeof createGrnSchema>;

// ── PUR-03 / GST-03 supplier bill ────────────────────────────────────────────

export const purchaseBillLineSchema = z.object({
  itemId: uuid,
  quantity,
  rate: money,
  /** Per line, because one bill can carry goods at different HSN rates. */
  cgstRate: gstRate,
  sgstRate: gstRate,
  igstRate: gstRate,
});
export type PurchaseBillLineDto = z.infer<typeof purchaseBillLineSchema>;

export const createPurchaseBillSchema = z
  .object({
    supplierPartyId: uuid,
    siteId: uuid,
    /** The supplier's invoice number — ours is the voucher number. */
    supplierInvoiceNo: z.string().min(1, 'The supplier invoice number is required').max(50),
    billDate: isoDate,
    dueDate: isoDate.nullish(),
    grnId: uuid.nullish(),
    lines: z.array(purchaseBillLineSchema).min(1, 'A bill needs at least one line'),
    notes: z.string().max(500).nullish(),
  })
  .superRefine((value, ctx) => {
    for (const [index, line] of value.lines.entries()) {
      const intra = Number(line.cgstRate) + Number(line.sgstRate);
      // Within a state GST splits into CGST + SGST; between states it is IGST.
      // Both on one line means somebody has charged tax twice.
      if (intra > 0 && Number(line.igstRate) > 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['lines', index, 'igstRate'],
          message: 'A line carries either CGST + SGST or IGST, never both',
        });
      }
    }
  });
export type CreatePurchaseBillDto = z.infer<typeof createPurchaseBillSchema>;
export type CreatePurchaseBillInput = z.input<typeof createPurchaseBillSchema>;

// ── PUR-04 supplier payment ──────────────────────────────────────────────────

export const billAllocationSchema = z.object({
  billId: uuid,
  amount: money,
});
export type BillAllocationDto = z.infer<typeof billAllocationSchema>;

/**
 * Bill-wise settlement: a payment names the bills it clears, so payables ageing
 * stays meaningful. An unallocated payment would sit against the supplier as a
 * lump the ageing report cannot place.
 */
export const createSupplierPaymentSchema = z.object({
  supplierPartyId: uuid,
  siteId: uuid,
  paymentDate: isoDate,
  mode: z.enum(PURCHASE_PAYMENT_MODES),
  /** The cash or bank ledger the money left. */
  paidFromLedgerId: uuid,
  allocations: z.array(billAllocationSchema).min(1, 'Name at least one bill this payment settles'),
  reference: z.string().max(80).nullish(),
  notes: z.string().max(500).nullish(),
});
export type CreateSupplierPaymentDto = z.infer<typeof createSupplierPaymentSchema>;
export type CreateSupplierPaymentInput = z.input<typeof createSupplierPaymentSchema>;

// ── PUR-05 purchase return / debit note ──────────────────────────────────────

export const purchaseReturnLineSchema = z.object({
  itemId: uuid,
  quantity,
  rate: money,
  cgstRate: gstRate,
  sgstRate: gstRate,
  igstRate: gstRate,
  warehouseId: uuid,
});
export type PurchaseReturnLineDto = z.infer<typeof purchaseReturnLineSchema>;

export const createPurchaseReturnSchema = z.object({
  supplierPartyId: uuid,
  siteId: uuid,
  billId: uuid.nullish(),
  returnDate: isoDate,
  reason: z.string().min(5, 'Say why the goods went back').max(500),
  lines: z.array(purchaseReturnLineSchema).min(1, 'A return needs at least one line'),
});
export type CreatePurchaseReturnDto = z.infer<typeof createPurchaseReturnSchema>;
export type CreatePurchaseReturnInput = z.input<typeof createPurchaseReturnSchema>;

// ── queries ──────────────────────────────────────────────────────────────────

const pagination = {
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
};

export const purchaseOrderQuerySchema = z.object({
  ...pagination,
  supplierPartyId: uuid.optional(),
  siteId: uuid.optional(),
  status: z.enum(PURCHASE_ORDER_STATUSES).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});
export type PurchaseOrderQueryDto = z.infer<typeof purchaseOrderQuerySchema>;

export const grnQuerySchema = z.object({
  ...pagination,
  supplierPartyId: uuid.optional(),
  siteId: uuid.optional(),
  purchaseOrderId: uuid.optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});
export type GrnQueryDto = z.infer<typeof grnQuerySchema>;

export const purchaseBillQuerySchema = z.object({
  ...pagination,
  supplierPartyId: uuid.optional(),
  siteId: uuid.optional(),
  /** Bills with something still owing — what a payables screen opens on. */
  unpaidOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  from: isoDate.optional(),
  to: isoDate.optional(),
});
export type PurchaseBillQueryDto = z.infer<typeof purchaseBillQuerySchema>;

/** PUR-06 — payables ageing, bucketed from the due date (or bill date if none). */
export const payablesAgeingQuerySchema = z.object({
  asOf: isoDate.optional(),
  supplierPartyId: uuid.optional(),
  siteId: uuid.optional(),
});
export type PayablesAgeingQueryDto = z.infer<typeof payablesAgeingQuerySchema>;
