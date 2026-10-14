import { z } from 'zod';
import { TENANT_STATUSES } from '../constants/domain';

export const tenantStatusEnum = z.enum(TENANT_STATUSES);

/**
 * `""` on an optional field means "cleared", not "invalid". The same shape as
 * `blankToNull` in schemas/auth, inlined here because the platform schema does
 * not share that module's imports.
 */
function blankToNull<T extends z.ZodType<string>>(schema: T) {
  return z
    .union([z.literal(''), schema, z.null()])
    .optional()
    .transform((value) => (value === '' ? null : value));
}

/**
 * Platform onboarding (PLT-05) — one call makes a company, its first financial
 * year, the owner user and the membership. The web wizard in S1.2 wraps this.
 *
 * The financial year defaults to the Indian FY the request falls in,
 * computed server-side if omitted.
 */
export const createTenantSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  stateCode: z.string().length(2, 'State code must be 2 characters (e.g. 09 for UP)'),
  gstin: blankToNull(z.string().length(15, 'GSTIN must be 15 characters')),
  planName: blankToNull(z.string().max(80)),
  ownerName: z.string().min(2, "Owner's name is required"),
  ownerMobile: z.string().min(10, 'Owner mobile must be at least 10 digits').max(20),
  ownerEmail: blankToNull(z.string().email('Must be a valid email address')),
  ownerPassword: z.string().min(6, 'Owner password must be at least 6 characters'),
  financialYear: z
    .object({
      name: z.string().min(4),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .optional(),
});
export type CreateTenantDto = z.infer<typeof createTenantSchema>;
/** What a form holds before `blankToNull` normalisation. */
export type CreateTenantInput = z.input<typeof createTenantSchema>;

/**
 * What the tenant list and detail return — PLT-04's metadata rule: counts and
 * dates only, never money, never the client's own parties.
 */
export interface TenantSummaryDto {
  id: string;
  name: string;
  stateCode: string;
  status: (typeof TENANT_STATUSES)[number];
  planName: string | null;
  trialEndsAt: string | null;
  lastActiveAt: string | null;
  createdAt: string;
}

export const suspendTenantSchema = z.object({
  reason: z.string().min(3, 'Say why — it goes on the audit trail').max(500).optional(),
});
export type SuspendTenantDto = z.infer<typeof suspendTenantSchema>;
