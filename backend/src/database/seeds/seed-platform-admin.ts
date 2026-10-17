import * as bcrypt from 'bcryptjs';
import type { EntityManager } from 'typeorm';
import { Company } from '../../modules/company/entities/company.entity';
import { Role } from '../../modules/auth/entities/role.entity';
import { User } from '../../modules/auth/entities/user.entity';
import { UserCompany } from '../../modules/auth/entities/user-company.entity';

export interface PlatformAdminInput {
  name: string;
  mobile: string;
  email: string;
  password: string;
}

export type PlatformAdminResult =
  | { created: true; userId: string; scaffoldCompanyId: string }
  | { created: false; updated: true; userId: string; scaffoldCompanyId: string }
  | { created: false; updated: false; reason: string };

const SCAFFOLD_COMPANY_NAME = 'Platform Scaffold';

/**
 * Upserts a `platform_admin` user — creates it on a fresh DB, or resets its
 * password on an existing one. Mirrors the test setup pattern: a scaffold
 * company exists only so `AuthService.defaultCompanyIdFor` resolves a session;
 * the platform admin never acts inside it.
 */
export async function seedPlatformAdmin(
  manager: EntityManager,
  input: PlatformAdminInput,
): Promise<PlatformAdminResult> {
  const role = await manager.getRepository(Role).findOne({ where: { code: 'platform_admin' } });
  if (!role) {
    return { created: false, updated: false, reason: 'platform_admin role is not seeded — run the RBAC seed first' };
  }

  const companyRepo = manager.getRepository(Company);
  let scaffold = await companyRepo.findOne({ where: { name: SCAFFOLD_COMPANY_NAME } });
  if (!scaffold) {
    scaffold = await companyRepo.save(
      companyRepo.create({ name: SCAFFOLD_COMPANY_NAME, stateCode: '09', status: 'active' }),
    );
  }

  const userRepo = manager.getRepository(User);
  const passwordHash = await bcrypt.hash(input.password, 10);

  const existing = await userRepo.findOne({ where: [{ mobile: input.mobile }, { email: input.email }] });

  if (existing) {
    existing.name = input.name;
    existing.mobile = input.mobile;
    existing.email = input.email;
    existing.passwordHash = passwordHash;
    existing.isActive = true;
    await userRepo.save(existing);

    const membershipRepo = manager.getRepository(UserCompany);
    const membership = await membershipRepo.findOne({ where: { userId: existing.id, companyId: scaffold.id } });
    if (!membership) {
      await membershipRepo.save(
        membershipRepo.create({ userId: existing.id, companyId: scaffold.id, roleId: role.id, isDefault: true }),
      );
    } else if (membership.roleId !== role.id) {
      membership.roleId = role.id;
      await membershipRepo.save(membership);
    }

    return { created: false, updated: true, userId: existing.id, scaffoldCompanyId: scaffold.id };
  }

  const user = await userRepo.save(
    userRepo.create({
      name: input.name,
      mobile: input.mobile,
      email: input.email,
      passwordHash,
      isActive: true,
      isSuperAdmin: false,
    }),
  );

  await manager.getRepository(UserCompany).save(
    manager.getRepository(UserCompany).create({
      userId: user.id,
      companyId: scaffold.id,
      roleId: role.id,
      isDefault: true,
    }),
  );

  return { created: true, userId: user.id, scaffoldCompanyId: scaffold.id };
}
