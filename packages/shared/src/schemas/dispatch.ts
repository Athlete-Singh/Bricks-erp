import { z } from 'zod';

const QUANTITY_PATTERN = /^\d{1,15}(\.\d{1,3})?$/;

const uuid = z.string().uuid('Invalid id');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

const quantity = z
  .string()
  .regex(QUANTITY_PATTERN, 'Enter a quantity like 5000 or 12.500')
  .refine((v) => Number(v) > 0, 'Quantity must be more than zero');

/**
 * A challan is raised (draft), then the truck leaves (confirmed), then the
 * customer signs for it (delivered). Stock moves at `confirmed` — that is the
 * moment bricks physically leave the yard, not when the paperwork is signed.
 */
export const DISPATCH_STATUSES = ['draft', 'confirmed', 'delivered', 'cancelled'] as const;
export type DispatchStatus = (typeof DISPATCH_STATUSES)[number];

// ── DSP-01 dispatch / delivery challan ───────────────────────────────────────

export const dispatchLineSchema = z.object({
  itemId: uuid,
  /** Which yard the bricks leave from — a dispatch cannot drain a warehouse it never names. */
  warehouseId: uuid,
  quantity,
  notes: z.string().max(500).optional().nullable(),
});
export type DispatchLineInput = z.input<typeof dispatchLineSchema>;

export const createDispatchSchema = z
  .object({
    siteId: uuid,
    customerPartyId: uuid,
    /**
     * Invoice-first flow: the bill already exists and already moved the stock
     * (ADR-038), so confirming this challan moves nothing. Challan-first flow
     * leaves this null and the confirm moves the stock itself.
     */
    salesInvoiceId: uuid.optional().nullable(),
    salesOrderId: uuid.optional().nullable(),
    vehicleId: uuid.optional().nullable(),
    driverId: uuid.optional().nullable(),
    /** LAB: the group that loaded the truck, so VEH-05 can price the loading. */
    loadingGroupId: uuid.optional().nullable(),
    dispatchDate: isoDate,
    loadingLocation: z.string().max(200).optional().nullable(),
    deliveryLocation: z.string().max(200).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
    lines: z.array(dispatchLineSchema).min(1, 'A challan needs at least one line'),
  })
  .superRefine((value, ctx) => {
    // The same item out of the same warehouse twice on one challan is a
    // double-count waiting to happen — the yard sees two deductions for one
    // loading. Merge them at entry instead.
    const seen = new Set<string>();
    value.lines.forEach((line, index) => {
      const key = `${line.itemId}:${line.warehouseId}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['lines', index],
          message: 'That item already appears on this challan from the same warehouse — merge the lines',
        });
      }
      seen.add(key);
    });
  });
export type CreateDispatchDto = z.infer<typeof createDispatchSchema>;
export type CreateDispatchInput = z.input<typeof createDispatchSchema>;

// ── DSP-02 confirm: the truck leaves the gate ────────────────────────────────

export const confirmDispatchSchema = z.object({
  /** Blank means "now" — the common case is confirming as the truck pulls out. */
  confirmedOn: isoDate.optional().nullable(),
});
export type ConfirmDispatchDto = z.infer<typeof confirmDispatchSchema>;

// ── DSP-03 delivery acknowledgement ──────────────────────────────────────────

export const acknowledgeDeliverySchema = z.object({
  receivedBy: z.string().min(1, 'Who received the load?').max(100),
  deliveredOn: isoDate,
  deliveryRemarks: z.string().max(1000).optional().nullable(),
});
export type AcknowledgeDeliveryDto = z.infer<typeof acknowledgeDeliverySchema>;

export const cancelDispatchSchema = z.object({
  reason: z.string().min(10, 'Say why in at least 10 characters').max(500),
});
export type CancelDispatchDto = z.infer<typeof cancelDispatchSchema>;

// ── queries ──────────────────────────────────────────────────────────────────

export const dispatchQuerySchema = z.object({
  status: z.enum(DISPATCH_STATUSES).optional(),
  customerPartyId: uuid.optional(),
  vehicleId: uuid.optional(),
  siteId: uuid.optional(),
  fromDate: isoDate.optional(),
  toDate: isoDate.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type DispatchQueryDto = z.infer<typeof dispatchQuerySchema>;

/**
 * LEK-04 gate reconciliation. The question it answers is "did every truck that
 * left the gate get billed?" — so the window is mandatory, not defaulted.
 */
export const gateReconciliationQuerySchema = z.object({
  fromDate: isoDate,
  toDate: isoDate,
  siteId: uuid.optional(),
});
export type GateReconciliationQueryDto = z.infer<typeof gateReconciliationQuerySchema>;
