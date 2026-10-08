import { ROLES, type Role } from './roles';

/**
 * Permission codes: `<module>.<action>` (CONVENTIONS.md).
 * Each phase appends the codes for the modules it builds; the seed is an upsert,
 * so re-running it after a new phase adds the new rows without touching the rest.
 */
export const PERMISSIONS = {
  COMPANY_VIEW: 'company.view',
  COMPANY_MANAGE: 'company.manage',
  USERS_MANAGE: 'users.manage',
  AUDIT_VIEW: 'audit.view',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface PermissionDefinition {
  code: PermissionCode;
  name: string;
  module: string;
  description: string;
}

/** Everything seeded into `permissions`. P1 covers M01 only. */
export const PERMISSION_CATALOGUE: readonly PermissionDefinition[] = [
  {
    code: PERMISSIONS.COMPANY_VIEW,
    name: 'View company',
    module: 'company',
    description: 'Read company profile, kilns/sites and financial years',
  },
  {
    code: PERMISSIONS.COMPANY_MANAGE,
    name: 'Manage company',
    module: 'company',
    description: 'Create and edit companies, kilns/sites and financial years',
  },
  {
    code: PERMISSIONS.USERS_MANAGE,
    name: 'Manage users',
    module: 'users',
    description: 'Create users, assign roles and kiln access',
  },
  {
    code: PERMISSIONS.AUDIT_VIEW,
    name: 'View audit log',
    module: 'audit',
    description: 'Read the audit trail of financial and stock changes',
  },
] as const;

export interface RoleDefinition {
  code: Role;
  name: string;
  description: string;
  permissions: readonly PermissionCode[];
}

/**
 * The 9 roles from the functional spec with their default permission sets (ADM-06).
 * Defaults chosen in P1.1b — see OPEN_QUESTIONS #13; the owner can confirm or adjust.
 * Super Admin additionally carries `users.is_super_admin`, which bypasses RolesGuard.
 */
export const ROLE_DEFINITIONS: readonly RoleDefinition[] = [
  {
    code: 'super_admin',
    name: 'Super Admin',
    description: 'Platform administrator across all companies',
    permissions: [
      PERMISSIONS.COMPANY_VIEW,
      PERMISSIONS.COMPANY_MANAGE,
      PERMISSIONS.USERS_MANAGE,
      PERMISSIONS.AUDIT_VIEW,
    ],
  },
  {
    code: 'owner',
    name: 'Owner',
    description: 'Business owner — full access within their companies',
    permissions: [
      PERMISSIONS.COMPANY_VIEW,
      PERMISSIONS.COMPANY_MANAGE,
      PERMISSIONS.USERS_MANAGE,
      PERMISSIONS.AUDIT_VIEW,
    ],
  },
  {
    code: 'accountant',
    name: 'Accountant',
    description: 'Books, vouchers and GST',
    permissions: [PERMISSIONS.COMPANY_VIEW, PERMISSIONS.AUDIT_VIEW],
  },
  {
    code: 'manager',
    name: 'Manager',
    description: 'Day-to-day operations across modules',
    permissions: [PERMISSIONS.COMPANY_VIEW, PERMISSIONS.USERS_MANAGE],
  },
  {
    code: 'production_manager',
    name: 'Production Manager',
    description: 'Production batches, firing and sorting',
    permissions: [PERMISSIONS.COMPANY_VIEW],
  },
  {
    code: 'supervisor',
    name: 'Supervisor',
    description: 'Field entries from the mobile app',
    permissions: [PERMISSIONS.COMPANY_VIEW],
  },
  {
    code: 'sales_executive',
    name: 'Sales Executive',
    description: 'Quotations, orders and invoices',
    permissions: [PERMISSIONS.COMPANY_VIEW],
  },
  {
    code: 'store_keeper',
    name: 'Store Keeper',
    description: 'Stock, GRN and issues',
    permissions: [PERMISSIONS.COMPANY_VIEW],
  },
  {
    code: 'driver',
    name: 'Driver',
    description: 'Trip and delivery acknowledgement only',
    permissions: [],
  },
] as const;

/** Guards against a role being added to ROLES without a seeded definition. */
export const ROLE_DEFINITION_CODES: readonly Role[] = ROLE_DEFINITIONS.map((r) => r.code);
export const ALL_ROLES_DEFINED = ROLES.every((r) => ROLE_DEFINITION_CODES.includes(r));
