/** The 9 roles from the functional spec. Seeded in P1; permissions are granular codes on top. */
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
] as const;
export type Role = (typeof ROLES)[number];
