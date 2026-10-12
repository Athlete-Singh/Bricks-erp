import { z } from 'zod';

const AMOUNT_PATTERN = /^\d{1,16}(\.\d{1,2})?$/;
const QUANTITY_PATTERN = /^\d{1,15}(\.\d{1,3})?$/;

const uuid = z.string().uuid('Invalid id');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

/** Money is a decimal string end to end — never a float (CONVENTIONS). */
const money = z
  .string()
  .regex(AMOUNT_PATTERN, 'Enter an amount like 1250.00')
  .refine((v) => Number(v) > 0, 'Amount must be more than zero');

const quantity = z
  .string()
  .regex(QUANTITY_PATTERN, 'Enter a quantity like 40 or 12.500')
  .refine((v) => Number(v) > 0, 'Quantity must be more than zero');

/**
 * What a vehicle cost money on. Each kind books to its own ledger, so the P&L
 * reads diesel, repairs, loading and hire on separate rows rather than one
 * "transport" lump the owner cannot act on.
 */
export const VEHICLE_EXPENSE_KINDS = ['diesel', 'maintenance', 'loading', 'hire'] as const;
export type VehicleExpenseKind = (typeof VEHICLE_EXPENSE_KINDS)[number];

// ── VEH-02 trip log ──────────────────────────────────────────────────────────

export const createTripSchema = z
  .object({
    vehicleId: uuid,
    driverId: uuid.nullish(),
    /** The load this trip carried, when it was a delivery rather than a errand. */
    dispatchId: uuid.nullish(),
    siteId: uuid,
    tripDate: isoDate,
    routeFrom: z.string().max(200).nullish(),
    routeTo: z.string().max(200).nullish(),
    distanceKm: quantity.nullish(),
    /**
     * Freight charged to the customer for this trip. Left out when the invoice
     * already carries a transport charge — the income is booked once (ADR-042).
     */
    freightAmount: money.nullish(),
    freightPartyId: uuid.nullish(),
    notes: z.string().max(1000).nullish(),
  })
  .superRefine((value, ctx) => {
    // Charging freight means somebody owes it. One without the other would
    // post a journal with nobody on the debit side.
    if (value.freightAmount && !value.freightPartyId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['freightPartyId'],
        message: 'Say who is being charged this freight',
      });
    }
    if (value.freightPartyId && !value.freightAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['freightAmount'],
        message: 'Enter the freight being charged',
      });
    }
  });
export type CreateTripDto = z.infer<typeof createTripSchema>;
export type CreateTripInput = z.input<typeof createTripSchema>;

// ── VEH-03…06 vehicle expenses ───────────────────────────────────────────────

export const createVehicleExpenseSchema = z
  .object({
    vehicleId: uuid,
    tripId: uuid.nullish(),
    siteId: uuid,
    kind: z.enum(VEHICLE_EXPENSE_KINDS),
    expenseDate: isoDate,
    amount: money,
    /** Litres for diesel; left out for everything else. */
    quantity: quantity.nullish(),
    /**
     * Paid now, from this cash or bank ledger. Left out means the charge is on
     * credit and `partyId` carries who is owed — a transporter's bill (VEH-06)
     * is the ordinary case.
     */
    paidFromLedgerId: uuid.nullish(),
    partyId: uuid.nullish(),
    /**
     * Diesel drawn from the kiln's own tank rather than bought at a pump. The
     * fuel is already in the books from its purchase bill, so this moves stock
     * and posts no journal (ADR-043).
     */
    itemId: uuid.nullish(),
    warehouseId: uuid.nullish(),
    reference: z.string().max(80).nullish(),
    notes: z.string().max(500).nullish(),
  })
  .superRefine((value, ctx) => {
    const fromTank = Boolean(value.itemId || value.warehouseId);

    if (fromTank) {
      if (value.kind !== 'diesel') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['warehouseId'],
          message: 'Only diesel can be drawn from a yard',
        });
      }
      if (!value.itemId || !value.warehouseId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [value.itemId ? 'warehouseId' : 'itemId'],
          message: 'Drawing from the tank needs both the fuel and the yard it leaves',
        });
      }
      if (!value.quantity) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['quantity'],
          message: 'Say how many litres were issued',
        });
      }
      // Fuel from the tank was paid for on its purchase bill. Naming a payment
      // here would book the same diesel twice.
      if (value.paidFromLedgerId || value.partyId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['paidFromLedgerId'],
          message: 'Fuel from your own tank is already paid for — leave the payment blank',
        });
      }
      return;
    }

    if (!value.paidFromLedgerId && !value.partyId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['paidFromLedgerId'],
        message: 'Say how it was paid, or who is owed for it',
      });
    }
    if (value.paidFromLedgerId && value.partyId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['partyId'],
        message: 'A charge is either paid now or owed to somebody — not both',
      });
    }
    // A hired vehicle's charge is owed to the transporter who sent it.
    if (value.kind === 'hire' && !value.partyId && !value.paidFromLedgerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['partyId'],
        message: 'Name the transporter this hire is owed to',
      });
    }
  });
export type CreateVehicleExpenseDto = z.infer<typeof createVehicleExpenseSchema>;
export type CreateVehicleExpenseInput = z.input<typeof createVehicleExpenseSchema>;

// ── queries ──────────────────────────────────────────────────────────────────

export const tripQuerySchema = z.object({
  vehicleId: uuid.optional(),
  driverId: uuid.optional(),
  siteId: uuid.optional(),
  fromDate: isoDate.optional(),
  toDate: isoDate.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type TripQueryDto = z.infer<typeof tripQuerySchema>;

export const vehicleExpenseQuerySchema = z.object({
  vehicleId: uuid.optional(),
  tripId: uuid.optional(),
  kind: z.enum(VEHICLE_EXPENSE_KINDS).optional(),
  fromDate: isoDate.optional(),
  toDate: isoDate.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type VehicleExpenseQueryDto = z.infer<typeof vehicleExpenseQuerySchema>;

/** VEH-07 — income minus what the vehicle cost, per vehicle, over a window. */
export const vehicleProfitabilityQuerySchema = z.object({
  fromDate: isoDate,
  toDate: isoDate,
  vehicleId: uuid.optional(),
});
export type VehicleProfitabilityQueryDto = z.infer<typeof vehicleProfitabilityQuerySchema>;
