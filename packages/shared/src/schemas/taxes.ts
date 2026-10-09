import { z } from 'zod';

const RATE_PATTERN = /^\d{1,3}(\.\d{1,2})?$/;

/**
 * A GST percentage, carried as a decimal string for the same reason money is.
 * Normalised to two decimals so that a rate reads the same whether it came back
 * from a create (reloaded from NUMERIC, "6.00") or an update (echoed from the
 * request, which used to return a bare "6").
 */
const gstRate = z
  .string()
  .regex(RATE_PATTERN, 'Enter a rate like 6 or 2.50')
  .refine((v) => Number(v) <= 100, 'Rate cannot exceed 100')
  .transform((v) => Number(v).toFixed(2))
  .default('0.00');

export const createHsnRateSchema = z.object({
  hsnCode: z.string().min(1, 'HSN/SAC code is required').max(20),
  description: z.string().max(255).optional().nullable(),
  cgstRate: gstRate,
  sgstRate: gstRate,
  igstRate: gstRate,
  isActive: z.boolean().default(true),
});
export type CreateHsnRateDto = z.infer<typeof createHsnRateSchema>;
export type CreateHsnRateInput = z.input<typeof createHsnRateSchema>;

export const updateHsnRateSchema = createHsnRateSchema.partial();
export type UpdateHsnRateDto = z.infer<typeof updateHsnRateSchema>;
export type UpdateHsnRateInput = z.input<typeof updateHsnRateSchema>;
