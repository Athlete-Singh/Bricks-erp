import { z } from 'zod';
import { PAYMENT_MODES, PaymentMode } from '../constants/domain';

const AMOUNT_PATTERN = /^\d{1,16}(\.\d{1,2})?$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export enum WageActivity {
  MAKING = 'making',
  LOADING = 'loading',
  UNLOADING = 'unloading',
  DAILY_WAGE = 'daily_wage',
}

export enum AttendanceStatus {
  PRESENT = 'present',
  HALF_DAY = 'half_day',
  ABSENT = 'absent',
}

export enum DeductionCategory {
  ADVANCE_RECOVERY = 'advance_recovery',
  KHURAK = 'khurak',
  LOAN_INSTALMENT = 'loan_instalment',
  FINE = 'fine',
}

export enum SettlementStatus {
  DRAFT = 'draft',
  POSTED = 'posted',
  PAID = 'paid',
}

// ── Wage Rates ───────────────────────────────────────────────────────────────

export const createWageRateSchema = z.object({
  activity: z.nativeEnum(WageActivity),
  unit: z.string().min(1, 'Unit is required').max(50),
  rateAmount: z
    .string()
    .regex(AMOUNT_PATTERN, 'Enter a rate like 650.00')
    .refine((v) => Number(v) > 0, 'Rate amount must be positive')
    .transform((v) => Number(v).toFixed(2)),
  effectiveFrom: z.string().regex(DATE_PATTERN, 'Use YYYY-MM-DD').optional(),
  isActive: z.boolean().default(true),
});
export type CreateWageRateDto = z.infer<typeof createWageRateSchema>;
export type CreateWageRateInput = z.input<typeof createWageRateSchema>;

export const updateWageRateSchema = createWageRateSchema.partial();
export type UpdateWageRateDto = z.infer<typeof updateWageRateSchema>;
export type UpdateWageRateInput = z.input<typeof updateWageRateSchema>;

// ── Labour Groups ────────────────────────────────────────────────────────────

export const createLabourGroupSchema = z.object({
  sardarPartyId: z.string().uuid('Select a valid Sardar party'),
  name: z.string().min(1, 'Group name is required').max(100),
  activity: z.nativeEnum(WageActivity),
  siteId: z.string().uuid('Select a valid site/kiln').optional(),
  isActive: z.boolean().default(true),
});
export type CreateLabourGroupDto = z.infer<typeof createLabourGroupSchema>;
export type CreateLabourGroupInput = z.input<typeof createLabourGroupSchema>;

export const updateLabourGroupSchema = createLabourGroupSchema.partial();
export type UpdateLabourGroupDto = z.infer<typeof updateLabourGroupSchema>;
export type UpdateLabourGroupInput = z.input<typeof updateLabourGroupSchema>;

// ── Workers ──────────────────────────────────────────────────────────────────

export const createWorkerSchema = z.object({
  labourGroupId: z.string().uuid('Select a valid labour group'),
  name: z.string().min(1, 'Worker name is required').max(100),
  phone: z.string().max(20).optional().nullable(),
  dailyWageRate: z
    .string()
    .regex(AMOUNT_PATTERN, 'Enter a valid rate')
    .transform((v) => Number(v).toFixed(2))
    .optional()
    .nullable(),
  isActive: z.boolean().default(true),
});
export type CreateWorkerDto = z.infer<typeof createWorkerSchema>;
export type CreateWorkerInput = z.input<typeof createWorkerSchema>;

export const updateWorkerSchema = createWorkerSchema.partial();
export type UpdateWorkerDto = z.infer<typeof updateWorkerSchema>;
export type UpdateWorkerInput = z.input<typeof updateWorkerSchema>;

// ── Attendance ───────────────────────────────────────────────────────────────

export const createAttendanceItemSchema = z.object({
  workerId: z.string().uuid('Select a valid worker').optional().nullable(),
  status: z.nativeEnum(AttendanceStatus),
  overtimeHours: z
    .string()
    .regex(/^\d{1,2}(\.\d{1,2})?$/, 'Enter valid overtime hours')
    .optional()
    .nullable(),
  remarks: z.string().max(255).optional().nullable(),
});

export const createAttendanceSchema = z.object({
  siteId: z.string().uuid('Select a valid kiln'),
  labourGroupId: z.string().uuid('Select a valid labour group'),
  date: z.string().regex(DATE_PATTERN, 'Use YYYY-MM-DD'),
  entries: z.array(createAttendanceItemSchema).min(1, 'At least one attendance entry is required'),
});
export type CreateAttendanceDto = z.infer<typeof createAttendanceSchema>;
export type CreateAttendanceInput = z.input<typeof createAttendanceSchema>;

// ── Advances (LAB-05 & LEK-03) ───────────────────────────────────────────────

export const createAdvanceSchema = z.object({
  siteId: z.string().uuid('Select a valid kiln'),
  sardarPartyId: z.string().uuid('Select a valid Sardar'),
  workerId: z.string().uuid().optional().nullable(),
  date: z.string().regex(DATE_PATTERN, 'Use YYYY-MM-DD'),
  amount: z
    .string()
    .regex(AMOUNT_PATTERN, 'Enter an amount like 5000.00')
    .refine((v) => Number(v) > 0, 'Amount must be positive')
    .transform((v) => Number(v).toFixed(2)),
  paymentMode: z.enum(PAYMENT_MODES),
  cashBankLedgerId: z.string().uuid('Select a valid cash/bank ledger'),
  remarks: z.string().max(255).optional().nullable(),
});
export type CreateAdvanceDto = z.infer<typeof createAdvanceSchema>;
export type CreateAdvanceInput = z.input<typeof createAdvanceSchema>;

// ── Deductions (LAB-06) ──────────────────────────────────────────────────────

export const createDeductionSchema = z.object({
  siteId: z.string().uuid('Select a valid kiln'),
  sardarPartyId: z.string().uuid('Select a valid Sardar'),
  workerId: z.string().uuid().optional().nullable(),
  date: z.string().regex(DATE_PATTERN, 'Use YYYY-MM-DD'),
  category: z.nativeEnum(DeductionCategory),
  amount: z
    .string()
    .regex(AMOUNT_PATTERN, 'Enter an amount like 1000.00')
    .refine((v) => Number(v) > 0, 'Amount must be positive')
    .transform((v) => Number(v).toFixed(2)),
  remarks: z.string().max(255).optional().nullable(),
});
export type CreateDeductionDto = z.infer<typeof createDeductionSchema>;
export type CreateDeductionInput = z.input<typeof createDeductionSchema>;

// ── Settlements (LAB-07) ─────────────────────────────────────────────────────

export const createSettlementSchema = z.object({
  siteId: z.string().uuid('Select a valid kiln'),
  sardarPartyId: z.string().uuid('Select a valid Sardar'),
  periodFrom: z.string().regex(DATE_PATTERN, 'Use YYYY-MM-DD'),
  periodTo: z.string().regex(DATE_PATTERN, 'Use YYYY-MM-DD'),
  advancesRecovered: z
    .string()
    .regex(AMOUNT_PATTERN, 'Enter valid amount')
    .transform((v) => Number(v).toFixed(2)),
  deductions: z
    .string()
    .regex(AMOUNT_PATTERN, 'Enter valid amount')
    .transform((v) => Number(v).toFixed(2)),
  paymentMode: z.enum(PAYMENT_MODES).optional(),
  cashBankLedgerId: z.string().uuid().optional().nullable(),
  remarks: z.string().max(255).optional().nullable(),
});
export type CreateSettlementDto = z.infer<typeof createSettlementSchema>;
export type CreateSettlementInput = z.input<typeof createSettlementSchema>;

// ── Auto Wage Accrual (LAB-04) ────────────────────────────────────────────────

export const accrueWagesSchema = z.object({
  siteId: z.string().uuid('Select a valid kiln'),
  sardarPartyId: z.string().uuid('Select a valid Sardar'),
  date: z.string().regex(DATE_PATTERN, 'Use YYYY-MM-DD'),
  periodFrom: z.string().regex(DATE_PATTERN, 'Use YYYY-MM-DD'),
  periodTo: z.string().regex(DATE_PATTERN, 'Use YYYY-MM-DD'),
  remarks: z.string().max(255).optional().nullable(),
});
export type AccrueWagesDto = z.infer<typeof accrueWagesSchema>;
export type AccrueWagesInput = z.input<typeof accrueWagesSchema>;

// ── Queries ───────────────────────────────────────────────────────────────────

export const attendanceQuerySchema = z.object({
  siteId: z.string().uuid().optional(),
  labourGroupId: z.string().uuid().optional(),
  workerId: z.string().uuid().optional(),
  date: z.string().regex(DATE_PATTERN).optional(),
  from: z.string().regex(DATE_PATTERN).optional(),
  to: z.string().regex(DATE_PATTERN).optional(),
});
export type AttendanceQueryDto = z.infer<typeof attendanceQuerySchema>;

export const advanceQuerySchema = z.object({
  siteId: z.string().uuid().optional(),
  sardarPartyId: z.string().uuid().optional(),
  workerId: z.string().uuid().optional(),
  from: z.string().regex(DATE_PATTERN).optional(),
  to: z.string().regex(DATE_PATTERN).optional(),
});
export type AdvanceQueryDto = z.infer<typeof advanceQuerySchema>;

export const deductionQuerySchema = z.object({
  siteId: z.string().uuid().optional(),
  sardarPartyId: z.string().uuid().optional(),
  workerId: z.string().uuid().optional(),
  category: z.nativeEnum(DeductionCategory).optional(),
  from: z.string().regex(DATE_PATTERN).optional(),
  to: z.string().regex(DATE_PATTERN).optional(),
});
export type DeductionQueryDto = z.infer<typeof deductionQuerySchema>;

export const settlementQuerySchema = z.object({
  siteId: z.string().uuid().optional(),
  sardarPartyId: z.string().uuid().optional(),
  status: z.nativeEnum(SettlementStatus).optional(),
  from: z.string().regex(DATE_PATTERN).optional(),
  to: z.string().regex(DATE_PATTERN).optional(),
});
export type SettlementQueryDto = z.infer<typeof settlementQuerySchema>;

export const exposureSummaryQuerySchema = z.object({
  siteId: z.string().uuid().optional(),
  onlyExposed: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});
export type ExposureSummaryQueryDto = z.infer<typeof exposureSummaryQuerySchema>;
