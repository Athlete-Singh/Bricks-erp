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

const moneyOrZero = z
  .string()
  .regex(AMOUNT_PATTERN, 'Enter an amount like 1250.00')
  .refine((v) => Number(v) >= 0, 'Amount cannot be negative');

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

export const QUOTATION_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'cancelled', 'expired'] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export const SALES_ORDER_STATUSES = ['open', 'partial', 'invoiced', 'cancelled'] as const;
export type SalesOrderStatus = (typeof SALES_ORDER_STATUSES)[number];

export const SALES_INVOICE_STATUSES = ['open', 'partial', 'paid', 'cancelled'] as const;
export type SalesInvoiceStatus = (typeof SALES_INVOICE_STATUSES)[number];

export const SALES_PAYMENT_MODES = ['cash', 'bank', 'upi'] as const;
export type SalesPaymentMode = (typeof SALES_PAYMENT_MODES)[number];

export const SALES_CHARGE_KINDS = ['loading', 'transport', 'other'] as const;
export type SalesChargeKind = (typeof SALES_CHARGE_KINDS)[number];

// ── SAL-01 quotation ─────────────────────────────────────────────────────────

/**
 * A line on a quote. Rate is per unit (per 1,000 bricks when the item is
 * brick-shaped, per tonne for coal, etc.) — the depth stays as in CP1 FEATURES.
 */
export const quotationLineSchema = z.object({
  itemId: uuid,
  quantity,
  rate: money,
  /** Flat per-line discount; a percentage comes down to this at the UI. */
  discount: moneyOrZero.default('0.00'),
  /** GST rates are indicative on a quote — the invoice is what the books trust. */
  cgstRate: gstRate,
  sgstRate: gstRate,
  igstRate: gstRate,
  description: z.string().max(200).nullish(),
});
export type QuotationLineDto = z.infer<typeof quotationLineSchema>;

const chargeSchema = z.object({
  kind: z.enum(SALES_CHARGE_KINDS),
  label: z.string().max(80),
  amount: moneyOrZero,
  cgstRate: gstRate,
  sgstRate: gstRate,
  igstRate: gstRate,
});
export type SalesChargeDto = z.infer<typeof chargeSchema>;

const gstLineRefineOne = (
  value: { cgstRate: string; sgstRate: string; igstRate: string },
  ctx: z.RefinementCtx,
  path: (string | number)[],
) => {
  // Within a state GST splits into CGST + SGST; between states it is IGST.
  // A line that names both means somebody has charged tax twice.
  const intra = Number(value.cgstRate) + Number(value.sgstRate);
  if (intra > 0 && Number(value.igstRate) > 0) {
    ctx.addIssue({
      code: 'custom',
      path: [...path, 'igstRate'],
      message: 'A line carries either CGST + SGST or IGST, never both',
    });
  }
};

export const createQuotationSchema = z
  .object({
    customerPartyId: uuid,
    siteId: uuid,
    quoteDate: isoDate,
    validUntil: isoDate.nullish(),
    lines: z.array(quotationLineSchema).min(1, 'A quotation needs at least one line'),
    charges: z.array(chargeSchema).default([]),
    notes: z.string().max(500).nullish(),
  })
  .superRefine((value, ctx) => {
    for (const [index, line] of value.lines.entries()) {
      gstLineRefineOne(line, ctx, ['lines', index]);
    }
    for (const [index, c] of (value.charges ?? []).entries()) {
      gstLineRefineOne(c, ctx, ['charges', index]);
    }
  });
export type CreateQuotationDto = z.infer<typeof createQuotationSchema>;
export type CreateQuotationInput = z.input<typeof createQuotationSchema>;

export const quotationStatusChangeSchema = z.object({
  status: z.enum(QUOTATION_STATUSES),
  reason: z.string().max(200).nullish(),
});
export type QuotationStatusChangeDto = z.infer<typeof quotationStatusChangeSchema>;

// ── SAL-02 sales order ───────────────────────────────────────────────────────

export const salesOrderLineSchema = z.object({
  itemId: uuid,
  quantity,
  rate: money,
  discount: moneyOrZero.default('0.00'),
  cgstRate: gstRate,
  sgstRate: gstRate,
  igstRate: gstRate,
  description: z.string().max(200).nullish(),
});
export type SalesOrderLineDto = z.infer<typeof salesOrderLineSchema>;

export const createSalesOrderSchema = z
  .object({
    customerPartyId: uuid,
    siteId: uuid,
    /** When the quote was accepted the SO is born from it. Optional for direct SOs. */
    quotationId: uuid.nullish(),
    orderDate: isoDate,
    expectedDate: isoDate.nullish(),
    lines: z.array(salesOrderLineSchema).min(1, 'A sales order needs at least one line'),
    charges: z.array(chargeSchema).default([]),
    notes: z.string().max(500).nullish(),
  })
  .superRefine((value, ctx) => {
    for (const [index, line] of value.lines.entries()) {
      gstLineRefineOne(line, ctx, ['lines', index]);
    }
    for (const [index, c] of (value.charges ?? []).entries()) {
      gstLineRefineOne(c, ctx, ['charges', index]);
    }
  });
export type CreateSalesOrderDto = z.infer<typeof createSalesOrderSchema>;
export type CreateSalesOrderInput = z.input<typeof createSalesOrderSchema>;

export const salesOrderStatusChangeSchema = z.object({
  status: z.enum(SALES_ORDER_STATUSES),
  reason: z.string().max(200).nullish(),
});
export type SalesOrderStatusChangeDto = z.infer<typeof salesOrderStatusChangeSchema>;

// ── SAL-03 tax invoice ───────────────────────────────────────────────────────

export const salesInvoiceLineSchema = z.object({
  itemId: uuid,
  /** The warehouse the bricks leave from — drives the stock OUT. */
  warehouseId: uuid,
  quantity,
  rate: money,
  discount: moneyOrZero.default('0.00'),
  cgstRate: gstRate,
  sgstRate: gstRate,
  igstRate: gstRate,
  /** HSN snapshot so an invoice stays correct if the HSN master changes later. */
  hsnCode: z.string().max(16).nullish(),
  description: z.string().max(200).nullish(),
});
export type SalesInvoiceLineDto = z.infer<typeof salesInvoiceLineSchema>;

export const createSalesInvoiceSchema = z
  .object({
    customerPartyId: uuid,
    siteId: uuid,
    salesOrderId: uuid.nullish(),
    /**
     * Challan-first flow: the truck already left and that challan already
     * deducted the yard, so this invoice must not deduct a second time
     * (ADR-041). Null is the ordinary invoice-first flow.
     */
    dispatchId: uuid.nullish(),
    invoiceDate: isoDate,
    dueDate: isoDate.nullish(),
    /** PO number from the customer, for their records. */
    customerPoNo: z.string().max(50).nullish(),
    lines: z.array(salesInvoiceLineSchema).min(1, 'An invoice needs at least one line'),
    /** Loading/transport charges on the invoice — composite supply (see OQ #17). */
    charges: z.array(chargeSchema).default([]),
    notes: z.string().max(500).nullish(),
  })
  .superRefine((value, ctx) => {
    for (const [index, line] of value.lines.entries()) {
      gstLineRefineOne(line, ctx, ['lines', index]);
    }
    for (const [index, c] of (value.charges ?? []).entries()) {
      gstLineRefineOne(c, ctx, ['charges', index]);
    }
  });
export type CreateSalesInvoiceDto = z.infer<typeof createSalesInvoiceSchema>;
export type CreateSalesInvoiceInput = z.input<typeof createSalesInvoiceSchema>;

// ── SAL-05 customer receipt ──────────────────────────────────────────────────

export const invoiceAllocationSchema = z.object({
  invoiceId: uuid,
  amount: money,
});
export type InvoiceAllocationDto = z.infer<typeof invoiceAllocationSchema>;

export const createCustomerReceiptSchema = z.object({
  customerPartyId: uuid,
  siteId: uuid,
  receiptDate: isoDate,
  mode: z.enum(SALES_PAYMENT_MODES),
  /** The cash or bank ledger that received the money. */
  depositToLedgerId: uuid,
  allocations: z.array(invoiceAllocationSchema).min(1, 'Name at least one invoice this receipt settles'),
  reference: z.string().max(80).nullish(),
  notes: z.string().max(500).nullish(),
});
export type CreateCustomerReceiptDto = z.infer<typeof createCustomerReceiptSchema>;
export type CreateCustomerReceiptInput = z.input<typeof createCustomerReceiptSchema>;

// ── SAL-06 credit / debit note ───────────────────────────────────────────────

/** A credit-note line. `quantity > 0` means bricks are coming back and will be re-stocked (OQ #19). */
export const creditNoteLineSchema = z.object({
  itemId: uuid,
  /** Omit to issue a value-only credit (price adjustment, rate error). */
  warehouseId: uuid.nullish(),
  quantity: z.string().regex(QUANTITY_PATTERN, 'Enter a quantity like 100 or 12.500').nullish(),
  rate: money,
  cgstRate: gstRate,
  sgstRate: gstRate,
  igstRate: gstRate,
  description: z.string().max(200).nullish(),
});
export type CreditNoteLineDto = z.infer<typeof creditNoteLineSchema>;

export const createCreditNoteSchema = z
  .object({
    customerPartyId: uuid,
    siteId: uuid,
    /** Linked to the invoice it adjusts, so the two can be reconciled. */
    invoiceId: uuid.nullish(),
    noteDate: isoDate,
    reason: z.string().min(5, 'Say why this credit is being issued').max(500),
    lines: z.array(creditNoteLineSchema).min(1, 'A credit note needs at least one line'),
  })
  .superRefine((value, ctx) => {
    for (const [index, line] of value.lines.entries()) {
      gstLineRefineOne(line, ctx, ['lines', index]);
      // A quantity means goods are coming back; without the warehouse the yard
      // cannot be credited with the return.
      if (line.quantity && Number(line.quantity) > 0 && !line.warehouseId) {
        ctx.addIssue({
          code: 'custom',
          path: ['lines', index, 'warehouseId'],
          message: 'A credit for returned goods needs the warehouse they are coming back to',
        });
      }
    }
  });
export type CreateCreditNoteDto = z.infer<typeof createCreditNoteSchema>;
export type CreateCreditNoteInput = z.input<typeof createCreditNoteSchema>;

export const debitNoteLineSchema = z.object({
  itemId: uuid,
  quantity: z.string().regex(QUANTITY_PATTERN, 'Enter a quantity like 100 or 12.500').nullish(),
  rate: money,
  cgstRate: gstRate,
  sgstRate: gstRate,
  igstRate: gstRate,
  description: z.string().max(200).nullish(),
});
export type DebitNoteLineDto = z.infer<typeof debitNoteLineSchema>;

export const createDebitNoteSchema = z
  .object({
    customerPartyId: uuid,
    siteId: uuid,
    invoiceId: uuid.nullish(),
    noteDate: isoDate,
    reason: z.string().min(5, 'Say why this debit is being raised').max(500),
    lines: z.array(debitNoteLineSchema).min(1, 'A debit note needs at least one line'),
  })
  .superRefine((value, ctx) => {
    for (const [index, line] of value.lines.entries()) {
      gstLineRefineOne(line, ctx, ['lines', index]);
    }
  });
export type CreateDebitNoteDto = z.infer<typeof createDebitNoteSchema>;
export type CreateDebitNoteInput = z.input<typeof createDebitNoteSchema>;

// ── queries ──────────────────────────────────────────────────────────────────

const pagination = {
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
};

export const quotationQuerySchema = z.object({
  ...pagination,
  customerPartyId: uuid.optional(),
  siteId: uuid.optional(),
  status: z.enum(QUOTATION_STATUSES).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});
export type QuotationQueryDto = z.infer<typeof quotationQuerySchema>;

export const salesOrderQuerySchema = z.object({
  ...pagination,
  customerPartyId: uuid.optional(),
  siteId: uuid.optional(),
  status: z.enum(SALES_ORDER_STATUSES).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});
export type SalesOrderQueryDto = z.infer<typeof salesOrderQuerySchema>;

export const salesInvoiceQuerySchema = z.object({
  ...pagination,
  customerPartyId: uuid.optional(),
  siteId: uuid.optional(),
  status: z.enum(SALES_INVOICE_STATUSES).optional(),
  /** Invoices with something still owing — what a receivables screen opens on. */
  unpaidOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  from: isoDate.optional(),
  to: isoDate.optional(),
});
export type SalesInvoiceQueryDto = z.infer<typeof salesInvoiceQuerySchema>;

export const customerReceiptQuerySchema = z.object({
  ...pagination,
  customerPartyId: uuid.optional(),
  siteId: uuid.optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});
export type CustomerReceiptQueryDto = z.infer<typeof customerReceiptQuerySchema>;

export const salesNoteQuerySchema = z.object({
  ...pagination,
  customerPartyId: uuid.optional(),
  invoiceId: uuid.optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});
export type SalesNoteQueryDto = z.infer<typeof salesNoteQuerySchema>;

/** SAL-07 — receivables ageing, bucketed from the due date (or invoice date if none). */
export const receivablesAgeingQuerySchema = z.object({
  asOf: isoDate.optional(),
  customerPartyId: uuid.optional(),
  siteId: uuid.optional(),
});
export type ReceivablesAgeingQueryDto = z.infer<typeof receivablesAgeingQuerySchema>;
