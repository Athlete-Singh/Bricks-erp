/**
 * The 9 kiln-side roles from the functional spec + 1 platform role (S1.1).
 * `platform_admin` runs the SaaS surface and holds **no** business permissions;
 * it is kept out of the owner's role picker in `KILN_ROLES`.
 */
export const ROLES = [
  'super_admin',
  'owner',
  'accountant',
  'manager',
  'production_manager',
  'supervisor',
  'sales_executive',
  'store_keeper',
  'driver',
  'platform_admin',
] as const;
export type Role = (typeof ROLES)[number];

/** The nine roles an owner may assign to a user of their own company. */
export const KILN_ROLES = ROLES.filter((r) => r !== 'platform_admin') as readonly Exclude<Role, 'platform_admin'>[];
