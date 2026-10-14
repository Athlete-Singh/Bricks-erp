import { z } from 'zod';
import { TENANT_STATUSES, TenantStatus } from '../constants/domain';

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
  requireSupportApproval: boolean;
  supportAccessGrantedUntil: string | null;
  createdAt: string;
}

/**
 * Tenant user metadata for the platform admin view (PLT-09 / S3.1).
 * Carries name, contact, role and status — no password hashes or business secrets.
 */
export interface TenantUserSummaryDto {
  id: string;
  name: string;
  email: string | null;
  mobile: string;
  roleCode: string;
  roleName: string;
  isActive: boolean;
  createdAt: string;
}

/**
 * Tenant site / kiln metadata for the platform admin view (PLT-09 / S3.1).
 */
export interface TenantSiteSummaryDto {
  id: string;
  name: string;
  code: string;
  type: string;
  isActive: boolean;
  createdAt: string;
}

/**
 * High-level counts for a tenant — adhering to the metadata boundary:
 * counts and dates only, never monetary balances.
 */
export interface TenantCountsDto {
  users: number;
  kilns: number;
  activeKilns: number;
  vouchers: number;
  salesInvoices: number;
}

/**
 * Full detail for a single tenant (PLT-09 / S3.1) — combines company metadata,
 * document counts, assigned users and registered kilns/sites.
 */
export interface TenantDetailDto extends TenantSummaryDto {
  gstin: string | null;
  counts: TenantCountsDto;
  users: TenantUserSummaryDto[];
  kilns: TenantSiteSummaryDto[];
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
  approvalCode: z.string().optional(),
});
export type CreateSupportSessionDto = z.infer<typeof createSupportSessionSchema>;

export const updateTenantSettingsSchema = z.object({
  requireSupportApproval: z.boolean().optional(),
});
export type UpdateTenantSettingsDto = z.infer<typeof updateTenantSettingsSchema>;

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

// ── Billing & Plans (S4 / PLT-11) ──────────────────────────────────────────

export const SUBSCRIPTION_STATUSES = ['trial', 'active', 'past_due', 'canceled'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const BILLING_CYCLES = ['monthly', 'yearly', 'custom'] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export const INVOICE_STATUSES = ['pending', 'paid', 'overdue', 'void'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_METHODS = ['upi', 'bank_transfer', 'card', 'cash', 'manual'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface PlatformPlan {
  code: string;
  name: string;
  description: string;
  priceMonthly: string;
  priceYearly: string;
  maxKilns: number | null;
  maxUsers: number | null;
  features: string[];
}

export const PLATFORM_PLANS: PlatformPlan[] = [
  {
    code: 'starter',
    name: 'Starter',
    description: 'Essential brick kiln operations for single-site businesses',
    priceMonthly: '2999.00',
    priceYearly: '29990.00',
    maxKilns: 1,
    maxUsers: 5,
    features: ['1 Production Kiln', 'Up to 5 Users', 'GST & Accounting', 'Standard Support'],
  },
  {
    code: 'growth',
    name: 'Growth',
    description: 'Multi-site operations with advance monitoring and dispatch',
    priceMonthly: '5999.00',
    priceYearly: '59990.00',
    maxKilns: 3,
    maxUsers: 15,
    features: ['Up to 3 Kilns', 'Up to 15 Users', 'Leakage & Trip Tracking', 'Priority Support'],
  },
  {
    code: 'enterprise',
    name: 'Enterprise',
    description: 'Unlimited scale across all chimneys and depots',
    priceMonthly: '11999.00',
    priceYearly: '119990.00',
    maxKilns: null,
    maxUsers: null,
    features: ['Unlimited Kilns', 'Unlimited Users', 'Dedicated Support', 'Custom Audit Export'],
  },
];

export interface PlatformInvoiceDto {
  id: string;
  companyId: string;
  invoiceNumber: string;
  amount: string;
  taxAmount: string;
  totalAmount: string;
  status: InvoiceStatus;
  planName: string;
  billingCycle: BillingCycle;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  paidAt: string | null;
  paymentMethod: PaymentMethod | null;
  paymentRef: string | null;
  notes: string | null;
  createdAt: string;
}

export interface TenantBillingInfoDto {
  tenantId: string;
  tenantName: string;
  planName: string;
  status: TenantStatus;
  subscriptionStatus: SubscriptionStatus;
  billingCycle: BillingCycle;
  trialEndsAt: string | null;
  gracePeriodDays: number;
  currentPlan: PlatformPlan | null;
  invoices: PlatformInvoiceDto[];
}

export const updateTenantSubscriptionSchema = z.object({
  planName: z.string().min(1).max(64).optional(),
  billingCycle: z.enum(BILLING_CYCLES).optional(),
  subscriptionStatus: z.enum(SUBSCRIPTION_STATUSES).optional(),
  trialEndsAt: z.string().min(10).nullable().optional(),
  gracePeriodDays: z.number().int().min(0).max(90).optional(),
});
export type UpdateTenantSubscriptionDto = z.infer<typeof updateTenantSubscriptionSchema>;

export const createPlatformInvoiceSchema = z.object({
  planName: z.string().min(1).max(64),
  billingCycle: z.enum(BILLING_CYCLES).default('monthly'),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid decimal amount'),
  taxAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid decimal amount')
    .default('0.00'),
  periodStart: z.string().min(10),
  periodEnd: z.string().min(10),
  dueDate: z.string().min(10, 'dueDate is required'),
  notes: z.string().max(500).optional(),
});
export type CreatePlatformInvoiceDto = z.infer<typeof createPlatformInvoiceSchema>;

export const recordPlatformPaymentSchema = z.object({
  paymentMethod: z.enum(PAYMENT_METHODS),
  paymentRef: z.string().min(1, 'Payment reference or UTR is required').max(64),
  paidAt: z.string().min(10).optional(),
  notes: z.string().max(500).optional(),
});
export type RecordPlatformPaymentDto = z.infer<typeof recordPlatformPaymentSchema>;

export interface ExpiryCheckResultDto {
  checkedTenants: number;
  suspendedTrials: Array<{ tenantId: string; name: string; trialEndsAt: string }>;
  overdueInvoices: Array<{ invoiceId: string; invoiceNumber: string; tenantId: string }>;
  suspendedForOverdue: Array<{ tenantId: string; name: string; invoiceNumber: string }>;
}
