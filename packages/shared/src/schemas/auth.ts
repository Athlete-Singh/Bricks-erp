import { z } from 'zod';
import { ROLES } from '../constants/roles';
import { GST_SCHEMES, SITE_TYPES } from '../constants/domain';

/**
 * An optional field a form may submit as an empty string.
 *
 * `z.string().email().optional()` rejects `""`, because an empty string is
 * neither `undefined` nor `null` — so clearing an optional input failed
 * validation instead of clearing the value. `""` becomes `null` here.
 *
 * `undefined` is deliberately left alone: on a PATCH, an absent key means
 * "leave this field as it is", while `null` means "clear it". Collapsing the
 * two would make every partial update wipe the field.
 *
 * Not `z.preprocess`, which types its input as `unknown` and breaks the
 * React Hook Form resolver.
 */
function blankToNull<T extends z.ZodType<string>>(schema: T) {
  return z
    .union([z.literal(''), schema, z.null()])
    .optional()
    .transform((value) => (value === '' ? null : value));
}

export const loginSchema = z.object({
  emailOrMobile: z.string().min(1, 'Email or mobile is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;

export const gstSchemeEnum = z.enum(GST_SCHEMES);

export const createCompanySchema = z.object({
  name: z.string().min(2, 'Company name is required'),
  gstin: blankToNull(z.string().length(15, 'GSTIN must be 15 characters')),
  pan: blankToNull(z.string().length(10, 'PAN must be 10 characters')),
  stateCode: z.string().length(2, 'State code must be 2 characters (e.g. 09 for UP)'),
  address: blankToNull(z.string()),
  logoUrl: blankToNull(z.string().url('Must be a valid URL')),
  gstScheme: gstSchemeEnum.default('regular_12_itc'),
  requireSupportApproval: z.boolean().optional(),
});
export type CreateCompanyDto = z.infer<typeof createCompanySchema>;

export const updateCompanySchema = createCompanySchema.partial();
export type UpdateCompanyDto = z.infer<typeof updateCompanySchema>;
export type UpdateCompanyInput = z.input<typeof updateCompanySchema>;

export const grantSupportAccessSchema = z.object({
  durationHours: z.number().int().min(1).max(72).default(4),
});
export type GrantSupportAccessDto = z.infer<typeof grantSupportAccessSchema>;

export const siteTypeEnum = z.enum(SITE_TYPES);

export const createSiteSchema = z.object({
  name: z.string().min(2, 'Site name is required'),
  code: z.string().min(1, 'Site code is required'),
  type: siteTypeEnum.default('kiln'),
  address: blankToNull(z.string()),
});
export type CreateSiteDto = z.infer<typeof createSiteSchema>;
/** Before defaults are applied — what a form holds, where `type` may be unset. */
export type CreateSiteInput = z.input<typeof createSiteSchema>;

export const createUserSchema = z.object({
  email: blankToNull(z.string().email('Must be a valid email address')),
  mobile: z.string().min(10, 'Mobile must be at least 10 digits'),
  name: z.string().min(2, 'Full name is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  roleCode: z.string().min(1, 'Role is required'),
  siteIds: z.array(z.string().uuid()).optional().default([]),
});
export type CreateUserDto = z.infer<typeof createUserSchema>;
export type CreateUserInput = z.input<typeof createUserSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;

export const switchCompanySchema = z.object({
  companyId: z.string().uuid('A valid company id is required'),
});
export type SwitchCompanyDto = z.infer<typeof switchCompanySchema>;

/** FY label is free text so Indian FYs read as "2026-27" (CONVENTIONS.md). */
export const createFinancialYearSchema = z
  .object({
    name: z.string().min(4, 'Financial year name is required'),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be YYYY-MM-DD'),
  })
  .refine((v) => v.endDate > v.startDate, {
    message: 'endDate must be after startDate',
    path: ['endDate'],
  });
export type CreateFinancialYearDto = z.infer<typeof createFinancialYearSchema>;

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: blankToNull(z.string().email('Must be a valid email address')),
  roleCode: z.string().min(1).optional(),
  siteIds: z.array(z.string().uuid()).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
/** What the edit form holds, before blank-to-null normalisation. */
export type UpdateUserInput = z.input<typeof updateUserSchema>;

/** Filters for the Owner's audit-log viewer (ADM-07). */
export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  entityName: z.string().min(1).optional(),
  entityId: z.string().min(1).optional(),
  action: z.string().min(1).optional(),
  userId: z.string().uuid().optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
export type AuditLogQueryDto = z.infer<typeof auditLogQuerySchema>;

export const AUDIT_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'PASSWORD_CHANGE'] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().nullable(),
    mobile: z.string(),
    name: z.string(),
    roleCode: z.string(),
    permissions: z.array(z.string()),
    isSuperAdmin: z.boolean(),
  }),
  company: z.object({
    id: z.string().uuid(),
    name: z.string(),
    gstin: z.string().nullable(),
    stateCode: z.string(),
    gstScheme: gstSchemeEnum,
  }),
  sites: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      code: z.string(),
      type: siteTypeEnum,
    }),
  ),
});
export type AuthResponseDto = z.infer<typeof authResponseSchema>;

// ── Accounting (ACC-01, ACC-04) ──────────────────────────────────────────────

export const createLedgerSchema = z.object({
  name: z.string().min(2, 'Ledger name is required'),
  groupId: z.string().uuid('Pick a group'),
  code: blankToNull(z.string().max(50)),
});
export type CreateLedgerDto = z.infer<typeof createLedgerSchema>;
export type CreateLedgerInput = z.input<typeof createLedgerSchema>;

const AMOUNT_PATTERN = /^\d{1,16}(\.\d{1,2})?$/;

/**
 * A money amount as a decimal string — never a float (CONVENTIONS).
 *
 * An untouched amount input submits `""`, and the pattern needs at least one
 * digit, so a blank has to be accepted and normalised. Without this a perfectly
 * ordinary voucher — debit on one line, credit on the other — failed validation
 * on the two fields the user correctly left empty.
 */
const moneyString = z
  .union([z.literal(''), z.string().regex(AMOUNT_PATTERN, 'Enter an amount like 1250.00')])
  .optional()
  .transform((value) => (value === '' || value === undefined ? '0.00' : value));

export const updateLedgerSchema = z.object({
  name: z.string().min(2).optional(),
  groupId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateLedgerDto = z.infer<typeof updateLedgerSchema>;

/**
 * Opening balance for one ledger (ACC-04). Debit and credit are separate rather
 * than one signed number, so the books read the way an accountant writes them.
 */
export const openingBalanceSchema = z
  .object({
    ledgerId: z.string().uuid(),
    openingDebit: moneyString,
    openingCredit: moneyString,
  })
  // A ledger opens on one side only, the way it is written in a book. The same
  // rule is a CHECK constraint on the table, so it holds even outside the API.
  .refine((v) => Number(v.openingDebit) === 0 || Number(v.openingCredit) === 0, {
    message: 'A ledger opens on one side only — enter a debit or a credit, not both',
    path: ['openingCredit'],
  });
export type OpeningBalanceDto = z.infer<typeof openingBalanceSchema>;
export type OpeningBalanceInput = z.input<typeof openingBalanceSchema>;

export const setOpeningBalancesSchema = z.object({
  financialYearId: z.string().uuid(),
  balances: z.array(openingBalanceSchema).min(1, 'Add at least one opening balance'),
});
export type SetOpeningBalancesDto = z.infer<typeof setOpeningBalancesSchema>;

// ── Vouchers (ACC-02, ACC-03) ────────────────────────────────────────────────

/** Manual voucher types. Sales/purchase/notes are posted by their documents. */
export const MANUAL_VOUCHER_TYPES = ['receipt', 'payment', 'contra', 'journal'] as const;
export type ManualVoucherType = (typeof MANUAL_VOUCHER_TYPES)[number];

/** Blank means "nothing on this side", not an invalid amount. */
const amountString = z
  .union([z.literal(''), z.string().regex(AMOUNT_PATTERN, 'Enter an amount like 1250.00')])
  .optional()
  .transform((value) => (value === '' ? undefined : value));

export const voucherLineSchema = z
  .object({
    ledgerId: z.string().uuid('Pick a ledger'),
    debit: amountString,
    credit: amountString,
    partyId: z.string().uuid().nullish(),
    siteId: z.string().uuid().nullish(),
    narration: blankToNull(z.string().max(500)),
  })
  // Mirrors the CHECK constraint on voucher_lines, so the message is useful
  // rather than a database error.
  .refine((v) => Number(v.debit ?? 0) > 0 !== Number(v.credit ?? 0) > 0, {
    message: 'Each line is a debit or a credit — enter exactly one',
    path: ['debit'],
  });
export type VoucherLineDto = z.infer<typeof voucherLineSchema>;

export const createVoucherSchema = z.object({
  voucherType: z.enum(MANUAL_VOUCHER_TYPES),
  voucherDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
  narration: blankToNull(z.string().max(1000)),
  siteId: z.string().uuid().nullish(),
  lines: z.array(voucherLineSchema).min(2, 'A voucher needs at least two lines'),
});
export type CreateVoucherDto = z.infer<typeof createVoucherSchema>;
export type CreateVoucherInput = z.input<typeof createVoucherSchema>;

export const reverseVoucherSchema = z.object({
  voucherDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  narration: blankToNull(z.string().max(1000)),
});
export type ReverseVoucherDto = z.infer<typeof reverseVoucherSchema>;

export const voucherQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  voucherType: z.string().min(1).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  ledgerId: z.string().uuid().optional(),
  status: z.enum(['posted', 'reversed']).optional(),
});
export type VoucherQueryDto = z.infer<typeof voucherQuerySchema>;

// ── Books: Day Book, Ledger statement, Trial Balance (ACC-05) ────────────────

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const dayBookQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  from: isoDate.optional(),
  to: isoDate.optional(),
  voucherType: z.string().min(1).optional(),
});
export type DayBookQueryDto = z.infer<typeof dayBookQuerySchema>;
export type DayBookQueryInput = z.input<typeof dayBookQuerySchema>;

export const ledgerStatementQuerySchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
});
export type LedgerStatementQueryDto = z.infer<typeof ledgerStatementQuerySchema>;

export const trialBalanceQuerySchema = z.object({
  /** Balances as at this date. Defaults to today. */
  asOf: isoDate.optional(),
  /** Movement from here; before it counts as opening. Defaults to the FY start. */
  from: isoDate.optional(),
  /** Hide ledgers with no opening balance and no movement. */
  includeZero: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});
export type TrialBalanceQueryDto = z.infer<typeof trialBalanceQuerySchema>;
/** What goes on the wire — `includeZero` is text there, boolean after parsing. */
export type TrialBalanceQueryInput = z.input<typeof trialBalanceQuerySchema>;
