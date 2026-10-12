import { z } from 'zod';

const uuid = z.string().uuid('Invalid id');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

/**
 * A GST return period is a calendar month — GSTR-1 and GSTR-3B are both filed
 * monthly for a kiln of this size, so the window is a month, not a free range.
 */
export const gstPeriodSchema = z.object({
  /** `YYYY-MM`, the month being reported. */
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM'),
  siteId: uuid.optional(),
});
export type GstPeriodDto = z.infer<typeof gstPeriodSchema>;

export const gstRegisterQuerySchema = z.object({
  fromDate: isoDate,
  toDate: isoDate,
  siteId: uuid.optional(),
});
export type GstRegisterQueryDto = z.infer<typeof gstRegisterQuerySchema>;
