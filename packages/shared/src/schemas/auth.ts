import { z } from 'zod';
import { ROLES } from '../constants/roles';
import { SITE_TYPES } from '../constants/domain';

export const loginSchema = z.object({
  emailOrMobile: z.string().min(1, 'Email or mobile is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;

export const createCompanySchema = z.object({
  name: z.string().min(2, 'Company name is required'),
  gstin: z.string().length(15, 'GSTIN must be 15 characters').optional().nullable(),
  pan: z.string().length(10, 'PAN must be 10 characters').optional().nullable(),
  stateCode: z.string().length(2, 'State code must be 2 characters (e.g. 09 for UP)'),
  address: z.string().optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
});
export type CreateCompanyDto = z.infer<typeof createCompanySchema>;

export const updateCompanySchema = createCompanySchema.partial();
export type UpdateCompanyDto = z.infer<typeof updateCompanySchema>;

export const siteTypeEnum = z.enum(SITE_TYPES);

export const createSiteSchema = z.object({
  name: z.string().min(2, 'Site name is required'),
  code: z.string().min(1, 'Site code is required'),
  type: siteTypeEnum.default('kiln'),
  address: z.string().optional().nullable(),
});
export type CreateSiteDto = z.infer<typeof createSiteSchema>;

export const createUserSchema = z.object({
  email: z.string().email().optional().nullable(),
  mobile: z.string().min(10, 'Mobile must be at least 10 digits'),
  name: z.string().min(2, 'Full name is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  roleCode: z.string().min(1, 'Role is required'),
  siteIds: z.array(z.string().uuid()).optional().default([]),
});
export type CreateUserDto = z.infer<typeof createUserSchema>;

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
