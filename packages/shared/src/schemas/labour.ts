import { z } from 'zod';

const AMOUNT_PATTERN = /^\d{1,16}(\.\d{1,2})?$/;

export enum WageActivity {
  MAKING = 'making',
  LOADING = 'loading',
  UNLOADING = 'unloading',
  DAILY_WAGE = 'daily_wage',
}

export const createWageRateSchema = z.object({
  activity: z.nativeEnum(WageActivity),
  unit: z.string().min(1, 'Unit is required').max(50), // e.g. "1000 bricks", "day"
  // A decimal string, not a number: the column is NUMERIC(18,2) and the driver
  // hands it back as a string. Typing it `number` made every response lie.
  // Normalised to paise so a create and an update return the same shape.
  rateAmount: z
    .string()
    .regex(AMOUNT_PATTERN, 'Enter a rate like 650.00')
    .refine((v) => Number(v) > 0, 'Rate amount must be positive')
    .transform((v) => Number(v).toFixed(2)),
  isActive: z.boolean().default(true),
});
export type CreateWageRateDto = z.infer<typeof createWageRateSchema>;
export type CreateWageRateInput = z.input<typeof createWageRateSchema>;

export const updateWageRateSchema = createWageRateSchema.partial();
export type UpdateWageRateDto = z.infer<typeof updateWageRateSchema>;
export type UpdateWageRateInput = z.input<typeof updateWageRateSchema>;
