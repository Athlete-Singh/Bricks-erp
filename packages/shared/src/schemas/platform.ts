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

/**
 * Support sessions (S2) — how a platform admin acquires one tenant's business
 * permissions, two hours, auto-closed, every audit row marked. The reason is
 * mandatory and goes on the trail: making somebody type one is most of what
 * stops casual looking (ADR-052).
 */
export const SUPPORT_SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export const AUDIT_ACTOR_KINDS = ['user', 'platform_support', 'system'] as const;
export type AuditActorKind = (typeof AUDIT_ACTOR_KINDS)[number];

export const SUPPORT_SESSION_CLOSE_KINDS = ['manual', 'expiry'] as const;
export type SupportSessionCloseKind = (typeof SUPPORT_SESSION_CLOSE_KINDS)[number];

export const createSupportSessionSchema = z.object({
  tenantId: z.string().uuid(),
  reason: z.string().min(3, 'A reason is required — it goes on the audit trail').max(500),
});
export type CreateSupportSessionDto = z.infer<typeof createSupportSessionSchema>;

export interface SupportSessionDto {
  id: string;
  tenantId: string;
  tenantName: string;
  platformUserId: string;
  platformUserName: string;
  reason: string;
  openedAt: string;
  expiresAt: string;
  closedAt: string | null;
  closedBy: SupportSessionCloseKind | null;
}
