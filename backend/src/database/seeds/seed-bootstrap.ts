import * as bcrypt from 'bcryptjs';
import type { EntityManager } from 'typeorm';
import { seedChartForCompany } from '../../accounting/chart-of-accounts.seed';
import { Company } from '../../modules/company/entities/company.entity';
import { Site } from '../../modules/company/entities/site.entity';
import { Role } from '../../modules/auth/entities/role.entity';
import { User } from '../../modules/auth/entities/user.entity';
import { UserCompany } from '../../modules/auth/entities/user-company.entity';

export interface BootstrapInput {
  companyName: string;
  stateCode: string;
  ownerName: string;
  ownerMobile: string;
  ownerEmail: string | null;
  ownerPassword: string;
}

export type BootstrapResult = { created: false; reason: string } | { created: true; companyId: string; userId: string };

/**
 * First company + Owner, so a fresh database can actually be signed into.
 *
 * Opt-in: only runs when SEED_OWNER_* are set, and never when any user already
 * exists, so it cannot touch a live database. Credentials come from the
 * environment — nothing is hardcoded here.
 */
export async function seedBootstrap(manager: EntityManager, input: BootstrapInput): Promise<BootstrapResult> {
  const userRepo = manager.getRepository(User);

  if ((await userRepo.count()) > 0) {
    return { created: false, reason: 'users already exist — refusing to bootstrap' };
  }

  const ownerRole = await manager.getRepository(Role).findOne({ where: { code: 'owner' } });
  if (!ownerRole) {
    return { created: false, reason: 'the owner role is not seeded — run the RBAC seed first' };
  }

  const companyRepo = manager.getRepository(Company);
  const company = await companyRepo.save(companyRepo.create({ name: input.companyName, stateCode: input.stateCode }));

  // The same chart `CompanyService.createCompany` would have built — this path
  // creates the company directly, so it has to do it too.
  await seedChartForCompany(manager, company.id);

  const siteRepo = manager.getRepository(Site);
  await siteRepo.save(
    siteRepo.create({ companyId: company.id, name: `${input.companyName} Kiln 1`, code: 'K1', type: 'kiln' }),
  );

  const user = await userRepo.save(
    userRepo.create({
      name: input.ownerName,
      mobile: input.ownerMobile,
      email: input.ownerEmail,
      passwordHash: await bcrypt.hash(input.ownerPassword, 10),
      isActive: true,
      isSuperAdmin: false,
    }),
  );

  const membershipRepo = manager.getRepository(UserCompany);
  await membershipRepo.save(
    membershipRepo.create({ userId: user.id, companyId: company.id, roleId: ownerRole.id, isDefault: true }),
  );

  return { created: true, companyId: company.id, userId: user.id };
}
