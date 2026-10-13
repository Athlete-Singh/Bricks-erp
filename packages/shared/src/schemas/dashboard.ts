import { z } from 'zod';

const uuid = z.string().uuid('Invalid id');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

/**
 * Benchmark from the Proposal §4 / Spec §22 — the owner's target cost per
 * 1,000 fired bricks. Kept as a constant for CP1; a per-company override is a
 * CP2 candidate (ADR note in CHANGELOG). The web surface colours the delta
 * against this number.
 */
export const COST_PER_THOUSAND_BENCHMARK = '4100.00';

// ── DSH-01 Owner summary ────────────────────────────────────────────────────

/**
 * One snapshot answering the Key Management Questions. `asOf` sets what "today"
 * means for the figures that lead with a date — a Monday report run on Tuesday
 * is still Monday's by passing `asOf`. `siteId` narrows to one kiln.
 */
export const dashboardSummaryQuerySchema = z.object({
  asOf: isoDate.optional(),
  siteId: uuid.optional(),
});
export type DashboardSummaryQueryDto = z.infer<typeof dashboardSummaryQuerySchema>;

// ── DSH-02 Monthly series ───────────────────────────────────────────────────

/**
 * Rolling 12 months by default (configurable). One point per calendar month on
 * each of production, sales, collection, expenses, coal, diesel — enough to
 * read the trend without flattening a seasonal kiln's year into one figure.
 */
export const dashboardMonthlyQuerySchema = z.object({
  fromMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM')
    .optional(),
  toMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM')
    .optional(),
  siteId: uuid.optional(),
});
export type DashboardMonthlyQueryDto = z.infer<typeof dashboardMonthlyQuerySchema>;

// ── CST-01 Cost per 1,000 ───────────────────────────────────────────────────

/**
 * CST-01 broken down by kiln × month × brick type with the seven cost buckets.
 * Coal / soil / electricity / loading / repairs / other follow the fired-brick
 * share for the month (ADR-049) — a kiln fires all grades in the same chamber,
 * so direct allocation to one brick type would be an invented number. Labour
 * reads the wage accruals as posted; if those tag a batch they attribute, else
 * they fall back to pro-rate the same way as the other buckets.
 */
export const costPerThousandQuerySchema = z.object({
  fromDate: isoDate,
  toDate: isoDate,
  siteId: uuid.optional(),
  brickTypeId: uuid.optional(),
});
export type CostPerThousandQueryDto = z.infer<typeof costPerThousandQuerySchema>;

// ── RPT-02 Daily operations ─────────────────────────────────────────────────

/**
 * One page per day — production, dispatch, sales, collection, expenses, coal
 * used, labour present. The report rolls up every module into a single answer
 * to the owner's "what happened yesterday" question.
 */
export const dailyReportQuerySchema = z.object({
  date: isoDate,
  siteId: uuid.optional(),
});
export type DailyReportQueryDto = z.infer<typeof dailyReportQuerySchema>;

// ── RPT-03 Sales register ───────────────────────────────────────────────────

/**
 * One row per sales-invoice line — customer, brick type, rate per 1,000,
 * discount, GST, total. The filterable version of GST-06 for a sales-only
 * reader (the GST register is tax-first, this is customer-first).
 */
export const salesRegisterQuerySchema = z.object({
  fromDate: isoDate,
  toDate: isoDate,
  customerId: uuid.optional(),
  itemId: uuid.optional(),
  siteId: uuid.optional(),
});
export type SalesRegisterQueryDto = z.infer<typeof salesRegisterQuerySchema>;

// ── RPT-04 Labour registers ─────────────────────────────────────────────────

/**
 * `attendance` or `wages` — the two labour registers the spec names. Both read
 * by Sardar, kiln and period; only attendance has a labour group, because a
 * wage accrual is raised for a Sardar over a period and never for one group.
 * Asking for a group on the wage register is refused rather than quietly
 * ignored — a filter that silently does nothing is how a half-filtered
 * register gets paid out.
 */
export const labourRegisterQuerySchema = z
  .object({
    kind: z.enum(['attendance', 'wages']),
    fromDate: isoDate,
    toDate: isoDate,
    sardarId: uuid.optional(),
    groupId: uuid.optional(),
    siteId: uuid.optional(),
  })
  .superRefine((q, ctx) => {
    if (q.kind === 'wages' && q.groupId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['groupId'],
        message: 'A wage accrual is raised per Sardar, not per group — filter the wage register by Sardar.',
      });
    }
  });
export type LabourRegisterQueryDto = z.infer<typeof labourRegisterQuerySchema>;
