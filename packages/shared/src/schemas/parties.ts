import { z } from 'zod';
import { PARTY_TYPES } from '../constants/domain';

const AMOUNT_PATTERN = /^\d{1,16}(\.\d{1,2})?$/;

function blankToNull<T extends z.ZodType<string>>(schema: T) {
  return z
    .union([z.literal(''), schema, z.null()])
    .optional()
    .transform((value) => (value === '' ? null : value));
}

const moneyString = z
  .union([z.literal(''), z.string().regex(AMOUNT_PATTERN, 'Enter an amount like 1250.00')])
  .optional()
  .transform((value) => (value === '' || value === undefined ? '0.00' : value));

export const partyTypeEnum = z.enum(PARTY_TYPES);

export const createPartySchema = z.object({
  name: z.string().min(2, 'Party name is required'),
  partyTypes: z.array(partyTypeEnum).min(1, 'Select at least one party type'),
  gstin: blankToNull(z.string().length(15, 'GSTIN must be 15 characters')),
  pan: blankToNull(z.string().length(10, 'PAN must be 10 characters')),
  stateCode: blankToNull(z.string().length(2, 'State code must be 2 characters')),
  address: blankToNull(z.string()),
  phone: blankToNull(z.string().min(10, 'Phone must be at least 10 digits')),
  email: blankToNull(z.string().email('Must be a valid email address')),
  openingDebit: moneyString,
  openingCredit: moneyString,
});
export type CreatePartyDto = z.infer<typeof createPartySchema>;
export type CreatePartyInput = z.input<typeof createPartySchema>;

export const updatePartySchema = z.object({
  name: z.string().min(2).optional(),
  partyTypes: z.array(partyTypeEnum).min(1).optional(),
  gstin: blankToNull(z.string().length(15, 'GSTIN must be 15 characters')),
  pan: blankToNull(z.string().length(10, 'PAN must be 10 characters')),
  stateCode: blankToNull(z.string().length(2, 'State code must be 2 characters')),
  address: blankToNull(z.string()),
  phone: blankToNull(z.string().min(10, 'Phone must be at least 10 digits')),
  email: blankToNull(z.string().email('Must be a valid email address')),
  isActive: z.boolean().optional(),
});
export type UpdatePartyDto = z.infer<typeof updatePartySchema>;
export type UpdatePartyInput = z.input<typeof updatePartySchema>;

export const partyQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  search: z.string().min(1).optional(),
  type: partyTypeEnum.optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  sort: z.string().optional().default('-created_at'),
});
export type PartyQueryDto = z.infer<typeof partyQuerySchema>;
export type PartyQueryInput = z.input<typeof partyQuerySchema>;
