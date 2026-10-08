import type { DataSource, EntityManager } from 'typeorm';
import { PERMISSION_CATALOGUE, ROLE_DEFINITIONS } from '@brics/shared';
import { Permission } from '../../modules/auth/entities/permission.entity';
import { RolePermission } from '../../modules/auth/entities/role-permission.entity';
import { Role } from '../../modules/auth/entities/role.entity';

export interface RbacSeedResult {
  permissions: number;
  roles: number;
  grants: number;
}

/**
 * Seeds the 9 spec roles and their default permission sets (ADM-06).
 *
 * Idempotent: matches on the natural key (`code`) and re-syncs each role's
 * grants, so later phases can add permissions and re-run it safely.
 */
export async function seedRbac(manager: EntityManager): Promise<RbacSeedResult> {
  const permissionRepo = manager.getRepository(Permission);
  const roleRepo = manager.getRepository(Role);
  const grantRepo = manager.getRepository(RolePermission);

  // ── permissions ────────────────────────────────────────────────────────────
  const permissionIdByCode = new Map<string, string>();
  for (const definition of PERMISSION_CATALOGUE) {
    const existing = await permissionRepo.findOne({ where: { code: definition.code } });
    const saved = existing
      ? await permissionRepo.save(
          Object.assign(existing, {
            name: definition.name,
            module: definition.module,
            description: definition.description,
          }),
        )
      : await permissionRepo.save(permissionRepo.create({ ...definition }));
    permissionIdByCode.set(definition.code, saved.id);
  }

  // ── roles + their grants ───────────────────────────────────────────────────
  let grants = 0;
  for (const definition of ROLE_DEFINITIONS) {
    const existing = await roleRepo.findOne({ where: { code: definition.code } });
    const role = existing
      ? await roleRepo.save(
          Object.assign(existing, {
            name: definition.name,
            description: definition.description,
            isSystemRole: true,
          }),
        )
      : await roleRepo.save(
          roleRepo.create({
            code: definition.code,
            name: definition.name,
            description: definition.description,
            isSystemRole: true,
            companyId: null,
          }),
        );

    // Re-sync rather than append, so removing a permission from the catalogue
    // actually revokes it on the next run.
    await grantRepo.delete({ roleId: role.id });
    const wanted = definition.permissions
      .map((code) => permissionIdByCode.get(code))
      .filter((id): id is string => Boolean(id));

    if (wanted.length > 0) {
      await grantRepo.save(wanted.map((permissionId) => grantRepo.create({ roleId: role.id, permissionId })));
      grants += wanted.length;
    }
  }

  return { permissions: PERMISSION_CATALOGUE.length, roles: ROLE_DEFINITIONS.length, grants };
}

/** Runs the RBAC seed in one transaction. */
export async function runRbacSeed(dataSource: DataSource): Promise<RbacSeedResult> {
  return dataSource.transaction((manager) => seedRbac(manager));
}
