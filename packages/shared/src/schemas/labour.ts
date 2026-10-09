import { z } from 'zod';

export enum WageActivity {
  MAKING = 'making',
  LOADING = 'loading',
  UNLOADING = 'unloading',
  DAILY_WAGE = 'daily_wage',
}

export const createWageRateSchema = z.object({
  activity: z.nativeEnum(WageActivity),
  unit: z.string().min(1, 'Unit is required').max(50), // e.g. "1000 bricks", "day"
  rateAmount: z.number().positive('Rate amount must be positive'),
  isActive: z.boolean().default(true),
});
export type CreateWageRateDto = z.infer<typeof createWageRateSchema>;

export const updateWageRateSchema = createWageRateSchema.partial();
export type UpdateWageRateDto = z.infer<typeof updateWageRateSchema>;
