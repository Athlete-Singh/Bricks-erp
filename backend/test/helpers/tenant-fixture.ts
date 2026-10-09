import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import * as bcrypt from 'bcryptjs';
import { DataSource, type EntityManager } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { setupApp } from '../../src/setup-app';
import { seedRbac } from '../../src/database/seeds/seed-rbac';
import { Company } from '../../src/modules/company/entities/company.entity';
import { User } from '../../src/modules/auth/entities/user.entity';
import { UserCompany } from '../../src/modules/auth/entities/user-company.entity';
import { Role } from '../../src/modules/auth/entities/role.entity';

/**
 * Two tenants, each with an Owner, for the master-data specs.
 *
 * P3.1b and P3.1c originally shipped with happy-path tests only — no proof that
 * one company cannot read or write another's masters. That is the exact failure
 * P1.1b existed to fix, and PROGRESS lists tenancy under "never cut
 * correctness", so every master spec now gets a second tenant cheaply.
 */
export interface TenantFixture {
  app: INestApplication<App>;
  dataSource: DataSource;
  companyA: Company;
  companyB: Company;
  /** Bearer token for an Owner of company A. */
  tokenA: string;
  /** Bearer token for an Owner of company B — used to prove isolation. */
  tokenB: string;
  reset: () => Promise<void>;
  close: () => Promise<void>;
}

export interface TenantFixtureOptions {
  /** Company names become `<prefix> A` / `<prefix> B`; fixtures are cleaned by this prefix. */
  prefix: string;
  /** Email domain for the two owners, e.g. `taxes.test`. */
  domain: string;
  /** Tenant-scoped tables to purge, in delete order (children first). */
  tables: readonly string[];
  /** Distinct per spec — the suites run in band but share one database. */
  mobilePrefix: string;
}

export async function createTenantFixture(options: TenantFixtureOptions): Promise<TenantFixture> {
  const { prefix, domain, tables, mobilePrefix } = options;
  const password = `${domain}-pw`;

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app: INestApplication<App> = moduleRef.createNestApplication();
  setupApp(app);
  await app.init();

  const dataSource = app.get(DataSource);

  const reset = async (): Promise<void> => {
    const companyScope = `SELECT id FROM "companies" WHERE "name" LIKE '${prefix} %'`;
    const statements = [
      ...tables.map((t) => `DELETE FROM "${t}" WHERE "company_id" IN (${companyScope});`),
      `DELETE FROM "audit_logs" WHERE "company_id" IN (${companyScope});`,
      `DELETE FROM "user_companies" WHERE "user_id" IN (SELECT id FROM "users" WHERE "email" LIKE '%@${domain}');`,
      `DELETE FROM "refresh_tokens" WHERE "user_id" IN (SELECT id FROM "users" WHERE "email" LIKE '%@${domain}');`,
      `DELETE FROM "users" WHERE "email" LIKE '%@${domain}';`,
      `DELETE FROM "companies" WHERE "name" LIKE '${prefix} %';`,
    ];
    await dataSource.query(statements.join('\n'));
  };

  await reset();
  await dataSource.transaction((manager: EntityManager) => seedRbac(manager));

  const ownerRole = await dataSource.getRepository(Role).findOneByOrFail({ code: 'owner' });
  const companyRepo = dataSource.getRepository(Company);
  const companyA = await companyRepo.save(companyRepo.create({ name: `${prefix} A`, stateCode: '09' }));
  const companyB = await companyRepo.save(companyRepo.create({ name: `${prefix} B`, stateCode: '27' }));

  const userRepo = dataSource.getRepository(User);
  const membershipRepo = dataSource.getRepository(UserCompany);
  const passwordHash = await bcrypt.hash(password, 10);

  const ownerA = await userRepo.save(
    userRepo.create({ email: `owner-a@${domain}`, mobile: `${mobilePrefix}1`, name: 'Owner A', passwordHash }),
  );
  const ownerB = await userRepo.save(
    userRepo.create({ email: `owner-b@${domain}`, mobile: `${mobilePrefix}2`, name: 'Owner B', passwordHash }),
  );
  await membershipRepo.save([
    membershipRepo.create({ userId: ownerA.id, companyId: companyA.id, roleId: ownerRole.id, isDefault: true }),
    membershipRepo.create({ userId: ownerB.id, companyId: companyB.id, roleId: ownerRole.id, isDefault: true }),
  ]);

  const login = async (email: string): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ emailOrMobile: email, password })
      .expect(200);
    return res.body.data.accessToken as string;
  };

  return {
    app,
    dataSource,
    companyA,
    companyB,
    tokenA: await login(`owner-a@${domain}`),
    tokenB: await login(`owner-b@${domain}`),
    reset,
    close: async () => {
      await reset();
      await app.close();
    },
  };
}
