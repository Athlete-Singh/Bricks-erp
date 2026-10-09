import { describe, expect, it } from 'vitest';
import { ROLES } from './roles';
import {
  ALL_ROLES_DEFINED,
  PERMISSION_CATALOGUE,
  PERMISSIONS,
  ROLE_DEFINITIONS,
  type PermissionCode,
} from './permissions';

/**
 * These are the invariants that P1.1b was written to protect: the 9 roles exist,
 * every permission a route can require is seeded, and no role carries a code
 * that the seed would silently drop. A role granted a code that is not in the
 * catalogue looks correct in source and denies every request at runtime.
 */
describe('permission catalogue', () => {
  const catalogueCodes = new Set<string>(PERMISSION_CATALOGUE.map((p) => p.code));

  it('seeds every code in PERMISSIONS', () => {
    const declared = Object.values(PERMISSIONS);
    const missing = declared.filter((code) => !catalogueCodes.has(code));
    expect(missing).toEqual([]);
  });

  it('has no catalogue entry that PERMISSIONS does not declare', () => {
    const declared = new Set<string>(Object.values(PERMISSIONS));
    const orphans = PERMISSION_CATALOGUE.filter((p) => !declared.has(p.code)).map((p) => p.code);
    expect(orphans).toEqual([]);
  });

  it('uses the `<module>.<action>` shape for every code', () => {
    for (const code of Object.values(PERMISSIONS)) {
      expect(code).toMatch(/^[a-z]+\.[a-z_]+$/);
    }
  });

  it('gives every code a name, module and description', () => {
    for (const entry of PERMISSION_CATALOGUE) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.module.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(0);
    }
  });

  it('declares a code for every master module built in P3', () => {
    for (const module of ['parties', 'inventory', 'transport', 'taxes', 'labour']) {
      expect(catalogueCodes.has(`${module}.view`)).toBe(true);
      expect(catalogueCodes.has(`${module}.manage`)).toBe(true);
    }
  });
});

describe('role definitions', () => {
  const catalogueCodes = new Set<string>(PERMISSION_CATALOGUE.map((p) => p.code));

  it('covers all 9 spec roles', () => {
    expect(ALL_ROLES_DEFINED).toBe(true);
    expect(ROLE_DEFINITIONS).toHaveLength(ROLES.length);
  });

  it('grants only codes that are actually seeded', () => {
    for (const role of ROLE_DEFINITIONS) {
      const unknown = role.permissions.filter((code) => !catalogueCodes.has(code));
      expect({ role: role.code, unknown }).toEqual({ role: role.code, unknown: [] });
    }
  });

  it('never grants the same code twice', () => {
    for (const role of ROLE_DEFINITIONS) {
      expect(new Set(role.permissions).size).toBe(role.permissions.length);
    }
  });

  it('gives the Owner and Super Admin every permission', () => {
    const all = Object.values(PERMISSIONS) as PermissionCode[];
    for (const code of ['owner', 'super_admin'] as const) {
      const role = ROLE_DEFINITIONS.find((r) => r.code === code);
      expect(role).toBeDefined();
      expect([...(role?.permissions ?? [])].sort()).toEqual([...all].sort());
    }
  });

  it('gives the Accountant authority over taxes — ADR-018 names the CA as the one who sets GST and HSN', () => {
    const accountant = ROLE_DEFINITIONS.find((r) => r.code === 'accountant');
    expect(accountant?.permissions).toContain(PERMISSIONS.TAXES_MANAGE);
  });

  it('never grants a `manage` code without its `view` counterpart', () => {
    for (const role of ROLE_DEFINITIONS) {
      const held = new Set<string>(role.permissions);
      for (const code of held) {
        if (!code.endsWith('.manage')) continue;
        const view = code.replace('.manage', '.view');
        // `users.manage` and `company.manage` are the two with no view pair.
        if (!catalogueCodes.has(view)) continue;
        expect({ role: role.code, code, hasView: held.has(view) }).toEqual({ role: role.code, code, hasView: true });
      }
    }
  });

  it('leaves the Driver with no module access — trips only (CP1 scope)', () => {
    const driver = ROLE_DEFINITIONS.find((r) => r.code === 'driver');
    expect(driver?.permissions).toEqual([]);
  });
});
