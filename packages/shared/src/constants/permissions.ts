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
  ACCOUNTS_VIEW: 'accounts.view',
  ACCOUNTS_MANAGE: 'accounts.manage',
  PARTIES_VIEW: 'parties.view',
  PARTIES_MANAGE: 'parties.manage',
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_MANAGE: 'inventory.manage',
  INVENTORY_ADJUST: 'inventory.adjust',
  TRANSPORT_VIEW: 'transport.view',
  TRANSPORT_MANAGE: 'transport.manage',
  TAXES_VIEW: 'taxes.view',
  TAXES_MANAGE: 'taxes.manage',
  LABOUR_VIEW: 'labour.view',
  LABOUR_MANAGE: 'labour.manage',
  PURCHASES_VIEW: 'purchases.view',
  PURCHASES_MANAGE: 'purchases.manage',
  PRODUCTION_VIEW: 'production.view',
  PRODUCTION_MANAGE: 'production.manage',
  SALES_VIEW: 'sales.view',
  SALES_MANAGE: 'sales.manage',
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
  {
    code: PERMISSIONS.ACCOUNTS_VIEW,
    name: 'View accounts',
    module: 'accounts',
    description: 'Read the chart of accounts, ledgers, vouchers and the books',
  },
  {
    code: PERMISSIONS.ACCOUNTS_MANAGE,
    name: 'Manage accounts',
    module: 'accounts',
    description: 'Create ledgers, set opening balances and post vouchers',
  },
  {
    code: PERMISSIONS.PARTIES_VIEW,
    name: 'View parties',
    module: 'parties',
    description: 'Read party masters (customers, suppliers, Sardars, transporters, employees)',
  },
  {
    code: PERMISSIONS.PARTIES_MANAGE,
    name: 'Manage parties',
    module: 'parties',
    description: 'Create and edit parties',
  },
  {
    code: PERMISSIONS.INVENTORY_VIEW,
    name: 'View inventory',
    module: 'inventory',
    description: 'Read inventory masters and stock levels',
  },
  {
    code: PERMISSIONS.INVENTORY_MANAGE,
    name: 'Manage inventory',
    module: 'inventory',
    description: 'Create and edit inventory masters and stock adjustments',
  },
  {
    code: PERMISSIONS.INVENTORY_ADJUST,
    name: 'Adjust stock',
    module: 'inventory',
    description: 'Correct a stock balance against a physical count — separate from inventory.manage on purpose',
  },
  {
    code: PERMISSIONS.TRANSPORT_VIEW,
    name: 'View transport',
    module: 'transport',
    description: 'Read transport masters (vehicles and drivers)',
  },
  {
    code: PERMISSIONS.TRANSPORT_MANAGE,
    name: 'Manage transport',
    module: 'transport',
    description: 'Create and edit transport masters',
  },
  {
    code: PERMISSIONS.TAXES_VIEW,
    name: 'View taxes',
    module: 'taxes',
    description: 'Read tax masters (HSN and GST rates)',
  },
  {
    code: PERMISSIONS.TAXES_MANAGE,
    name: 'Manage taxes',
    module: 'taxes',
    description: 'Create and edit tax masters',
  },
  {
    code: PERMISSIONS.LABOUR_VIEW,
    name: 'View labour',
    module: 'labour',
    description: 'Read labour masters (wage rates)',
  },
  {
    code: PERMISSIONS.LABOUR_MANAGE,
    name: 'Manage labour',
    module: 'labour',
    description: 'Create and edit labour masters',
  },
  {
    code: PERMISSIONS.PURCHASES_VIEW,
    name: 'View purchases',
    module: 'purchases',
    description: 'Read purchase orders, goods receipts, supplier bills and payables',
  },
  {
    code: PERMISSIONS.PURCHASES_MANAGE,
    name: 'Manage purchases',
    module: 'purchases',
    description: 'Raise purchase orders, receive goods, enter supplier bills and pay them',
  },
  {
    code: PERMISSIONS.PRODUCTION_VIEW,
    name: 'View production',
    module: 'production',
    description: 'Read production batches, stage entries and the yield variance report',
  },
  {
    code: PERMISSIONS.PRODUCTION_MANAGE,
    name: 'Manage production',
    module: 'production',
    description: 'Create production batches and record stage entries (making, drying, firing, sorting)',
  },
  {
    code: PERMISSIONS.SALES_VIEW,
    name: 'View sales',
    module: 'sales',
    description: 'Read quotations, sales orders, invoices, receipts and receivables',
  },
  {
    code: PERMISSIONS.SALES_MANAGE,
    name: 'Manage sales',
    module: 'sales',
    description: 'Raise quotations and sales orders, issue invoices, record receipts and notes',
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
 * Defaults chosen in P1.1b and widened in P3.1 when the master modules landed —
 * see OPEN_QUESTIONS #13; the owner can confirm or adjust.
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
      PERMISSIONS.ACCOUNTS_VIEW,
      PERMISSIONS.ACCOUNTS_MANAGE,
      PERMISSIONS.PARTIES_VIEW,
      PERMISSIONS.PARTIES_MANAGE,
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.INVENTORY_MANAGE,
      PERMISSIONS.INVENTORY_ADJUST,
      PERMISSIONS.TRANSPORT_VIEW,
      PERMISSIONS.TRANSPORT_MANAGE,
      PERMISSIONS.TAXES_VIEW,
      PERMISSIONS.TAXES_MANAGE,
      PERMISSIONS.LABOUR_VIEW,
      PERMISSIONS.LABOUR_MANAGE,
      PERMISSIONS.PRODUCTION_VIEW,
      PERMISSIONS.PRODUCTION_MANAGE,
      PERMISSIONS.PURCHASES_VIEW,
      PERMISSIONS.PURCHASES_MANAGE,
      PERMISSIONS.SALES_VIEW,
      PERMISSIONS.SALES_MANAGE,
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
      PERMISSIONS.ACCOUNTS_VIEW,
      PERMISSIONS.ACCOUNTS_MANAGE,
      PERMISSIONS.PARTIES_VIEW,
      PERMISSIONS.PARTIES_MANAGE,
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.INVENTORY_MANAGE,
      PERMISSIONS.INVENTORY_ADJUST,
      PERMISSIONS.TRANSPORT_VIEW,
      PERMISSIONS.TRANSPORT_MANAGE,
      PERMISSIONS.TAXES_VIEW,
      PERMISSIONS.TAXES_MANAGE,
      PERMISSIONS.LABOUR_VIEW,
      PERMISSIONS.LABOUR_MANAGE,
      PERMISSIONS.PRODUCTION_VIEW,
      PERMISSIONS.PRODUCTION_MANAGE,
      PERMISSIONS.PURCHASES_VIEW,
      PERMISSIONS.PURCHASES_MANAGE,
      PERMISSIONS.SALES_VIEW,
      PERMISSIONS.SALES_MANAGE,
    ],
  },
  {
    code: 'accountant',
    name: 'Accountant',
    description: 'Books, vouchers and GST',
    permissions: [
      PERMISSIONS.COMPANY_VIEW,
      PERMISSIONS.AUDIT_VIEW,
      PERMISSIONS.ACCOUNTS_VIEW,
      PERMISSIONS.ACCOUNTS_MANAGE,
      PERMISSIONS.PARTIES_VIEW,
      PERMISSIONS.PARTIES_MANAGE,
      // ADR-018 names the client's CA as the authority on HSN codes and GST
      // rates, and the Accountant is that person's role here. Without
      // `taxes.manage` the one role qualified to set the rates could not.
      PERMISSIONS.TAXES_VIEW,
      PERMISSIONS.TAXES_MANAGE,
      PERMISSIONS.INVENTORY_VIEW,
      // Production is a cost driver, so the Accountant reads but does not post.
      PERMISSIONS.PRODUCTION_VIEW,
      PERMISSIONS.PURCHASES_VIEW,
      PERMISSIONS.PURCHASES_MANAGE,
      // The books person issues invoices and records receipts.
      PERMISSIONS.SALES_VIEW,
      PERMISSIONS.SALES_MANAGE,
    ],
  },
  {
    code: 'manager',
    name: 'Manager',
    description: 'Day-to-day operations across modules',
    permissions: [
      PERMISSIONS.COMPANY_VIEW,
      PERMISSIONS.USERS_MANAGE,
      PERMISSIONS.ACCOUNTS_VIEW,
      PERMISSIONS.PARTIES_VIEW,
      PERMISSIONS.PARTIES_MANAGE,
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.INVENTORY_ADJUST,
      PERMISSIONS.TRANSPORT_VIEW,
      PERMISSIONS.TAXES_VIEW,
      PERMISSIONS.LABOUR_VIEW,
      PERMISSIONS.PRODUCTION_VIEW,
      PERMISSIONS.PRODUCTION_MANAGE,
      PERMISSIONS.PURCHASES_VIEW,
      PERMISSIONS.PURCHASES_MANAGE,
      PERMISSIONS.SALES_VIEW,
      PERMISSIONS.SALES_MANAGE,
    ],
  },
  {
    code: 'production_manager',
    name: 'Production Manager',
    description: 'Production batches, firing and sorting',
    // Brick grades (PRD-01) are an inventory master and this role's own subject.
    permissions: [
      PERMISSIONS.COMPANY_VIEW,
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.INVENTORY_MANAGE,
      PERMISSIONS.LABOUR_VIEW,
      PERMISSIONS.PRODUCTION_VIEW,
      PERMISSIONS.PRODUCTION_MANAGE,
      PERMISSIONS.PURCHASES_VIEW,
      PERMISSIONS.PURCHASES_MANAGE,
    ],
  },
  {
    code: 'supervisor',
    name: 'Supervisor',
    description: 'Field entries from the mobile app',
    permissions: [
      PERMISSIONS.COMPANY_VIEW,
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.LABOUR_VIEW,
      // Supervisor is the role the Flutter app signs in with (M1). Production
      // entry is a mobile use-case (PRD-06), so this role posts stages too.
      PERMISSIONS.PRODUCTION_VIEW,
      PERMISSIONS.PRODUCTION_MANAGE,
      PERMISSIONS.PURCHASES_VIEW,
    ],
  },
  {
    code: 'sales_executive',
    name: 'Sales Executive',
    description: 'Quotations, orders and invoices',
    // Needs the grades to quote and the GST rate to price.
    permissions: [
      PERMISSIONS.COMPANY_VIEW,
      PERMISSIONS.PARTIES_VIEW,
      PERMISSIONS.PARTIES_MANAGE,
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.TAXES_VIEW,
      // Sorted stock is what the sales team quotes against.
      PERMISSIONS.PRODUCTION_VIEW,
      // The role's actual subject — quotes, orders and invoices.
      PERMISSIONS.SALES_VIEW,
      PERMISSIONS.SALES_MANAGE,
    ],
  },
  {
    code: 'store_keeper',
    name: 'Store Keeper',
    description: 'Stock, GRN and issues',
    permissions: [
      PERMISSIONS.COMPANY_VIEW,
      PERMISSIONS.PARTIES_VIEW,
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.INVENTORY_MANAGE,
      // Goods arrive and leave on a vehicle, so a GRN needs to name one.
      PERMISSIONS.TRANSPORT_VIEW,
      // The store keeper sees what sorting is producing so stock lines up.
      PERMISSIONS.PRODUCTION_VIEW,
      PERMISSIONS.PURCHASES_VIEW,
      PERMISSIONS.PURCHASES_MANAGE,
    ],
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
