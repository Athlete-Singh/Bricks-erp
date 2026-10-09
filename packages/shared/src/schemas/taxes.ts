import { z } from 'zod';

export const createHsnRateSchema = z.object({
  hsnCode: z.string().min(1, 'HSN/SAC code is required').max(20),
  description: z.string().max(255).optional().nullable(),
  cgstRate: z.number().min(0).max(100).default(0),
  sgstRate: z.number().min(0).max(100).default(0),
  igstRate: z.number().min(0).max(100).default(0),
  isActive: z.boolean().default(true),
});
export type CreateHsnRateDto = z.infer<typeof createHsnRateSchema>;

export const updateHsnRateSchema = createHsnRateSchema.partial();
export type UpdateHsnRateDto = z.infer<typeof updateHsnRateSchema>;
