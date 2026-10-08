import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';
import { seedRbac } from '../src/database/seeds/seed-rbac';
import { Company } from '../src/modules/company/entities/company.entity';
import { Site } from '../src/modules/company/entities/site.entity';
import { User } from '../src/modules/auth/entities/user.entity';
import { UserCompany } from '../src/modules/auth/entities/user-company.entity';
import { Role } from '../src/modules/auth/entities/role.entity';

/**
 * Tenancy is one of the things AGENTS.md says is never cut, so it is proved
 * here against a real database: two companies, one owner each, and every
 * cross-tenant path must be refused.
 */
describe('Tenant isolation (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  let companyA: Company;
  let companyB: Company;
  let siteA: Site;
  let siteB: Site;
  let tokenA: string;

  const PASSWORD = 'owner-password';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();

    dataSource = app.get(DataSource);
    await resetFixtures();

    await dataSource.transaction((manager) => seedRbac(manager));
    const ownerRole = await dataSource.getRepository(Role).findOneByOrFail({ code: 'owner' });

    const companyRepo = dataSource.getRepository(Company);
    companyA = await companyRepo.save(companyRepo.create({ name: 'Tenant A Bricks', stateCode: '09' }));
    companyB = await companyRepo.save(companyRepo.create({ name: 'Tenant B Bricks', stateCode: '27' }));

    const siteRepo = dataSource.getRepository(Site);
    siteA = await siteRepo.save(siteRepo.create({ companyId: companyA.id, name: 'Kiln A1', code: 'A1', type: 'kiln' }));
    siteB = await siteRepo.save(siteRepo.create({ companyId: companyB.id, name: 'Kiln B1', code: 'B1', type: 'kiln' }));

    const userRepo = dataSource.getRepository(User);
    const membershipRepo = dataSource.getRepository(UserCompany);
    const passwordHash = await bcrypt.hash(PASSWORD, 10);

    const ownerA = await userRepo.save(
      userRepo.create({ email: 'owner-a@tenancy.test', mobile: '9000000001', name: 'Owner A', passwordHash }),
    );
    const ownerB = await userRepo.save(
      userRepo.create({ email: 'owner-b@tenancy.test', mobile: '9000000002', name: 'Owner B', passwordHash }),
    );
    await membershipRepo.save([
      membershipRepo.create({ userId: ownerA.id, companyId: companyA.id, roleId: ownerRole.id, isDefault: true }),
      membershipRepo.create({ userId: ownerB.id, companyId: companyB.id, roleId: ownerRole.id, isDefault: true }),
    ]);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ emailOrMobile: 'owner-a@tenancy.test', password: PASSWORD })
      .expect(200);
    tokenA = login.body.data.accessToken;
  });

  afterAll(async () => {
    await resetFixtures();
    await app.close();
  });

  async function resetFixtures(): Promise<void> {
    await dataSource.query(`
      DELETE FROM "user_sites" WHERE "user_id" IN (SELECT id FROM "users" WHERE "email" LIKE '%@tenancy.test');
      DELETE FROM "refresh_tokens" WHERE "user_id" IN (SELECT id FROM "users" WHERE "email" LIKE '%@tenancy.test');
      DELETE FROM "user_companies" WHERE "user_id" IN (SELECT id FROM "users" WHERE "email" LIKE '%@tenancy.test');
      DELETE FROM "users" WHERE "email" LIKE '%@tenancy.test' OR "mobile" LIKE '90000000%';
      DELETE FROM "audit_logs" WHERE "company_id" IN (SELECT id FROM "companies" WHERE "name" LIKE 'Tenant % Bricks');
      DELETE FROM "financial_years" WHERE "company_id" IN (SELECT id FROM "companies" WHERE "name" LIKE 'Tenant % Bricks');
      DELETE FROM "sites" WHERE "company_id" IN (SELECT id FROM "companies" WHERE "name" LIKE 'Tenant % Bricks');
      DELETE FROM "companies" WHERE "name" LIKE 'Tenant % Bricks';
    `);
  }

  const asA = (method: 'get' | 'post' | 'put' | 'patch', path: string) =>
    request(app.getHttpServer())[method](`/api/v1${path}`).set('Authorization', `Bearer ${tokenA}`);

  describe('company scope', () => {
    it('lists only the companies the caller belongs to', async () => {
      const res = await asA('get', '/companies').expect(200);
      const ids = (res.body.data as Company[]).map((c) => c.id);

      expect(ids).toContain(companyA.id);
      expect(ids).not.toContain(companyB.id);
    });

    it('refuses to read another tenant company by id', async () => {
      const res = await asA('get', `/companies/${companyB.id}`).expect(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('refuses to update another tenant company', async () => {
      await asA('put', `/companies/${companyB.id}`).send({ name: 'Hijacked' }).expect(403);

      const untouched = await dataSource.getRepository(Company).findOneByOrFail({ id: companyB.id });
      expect(untouched.name).toBe('Tenant B Bricks');
    });

    it('returns the caller own company as current', async () => {
      const res = await asA('get', '/companies/current').expect(200);
      expect(res.body.data.id).toBe(companyA.id);
    });
  });

  describe('sub-resource scope', () => {
    it('lists only the caller own kilns', async () => {
      const res = await asA('get', '/sites').expect(200);
      const ids = (res.body.data as Site[]).map((s) => s.id);

      expect(ids).toEqual([siteA.id]);
      expect(ids).not.toContain(siteB.id);
    });

    it('creates kilns in the caller company, never a company named in the request', async () => {
      const res = await asA('post', '/sites')
        .send({ name: 'Kiln A2', code: 'A2', type: 'kiln', companyId: companyB.id })
        .expect(201);

      expect(res.body.data.companyId).toBe(companyA.id);
    });

    it('refuses kiln access pointing at another tenant kiln', async () => {
      await asA('post', '/users')
        .send({
          name: 'Smuggled Supervisor',
          mobile: '9000000003',
          password: 'secret123',
          roleCode: 'supervisor',
          siteIds: [siteB.id],
        })
        .expect(400);
    });

    it('lists only the caller own users', async () => {
      const res = await asA('get', '/users').expect(200);
      const emails = (res.body.data as Array<{ email: string | null }>).map((u) => u.email);

      expect(emails).toContain('owner-a@tenancy.test');
      expect(emails).not.toContain('owner-b@tenancy.test');
    });
  });

  describe('response and error contract', () => {
    it('wraps a payload once, not twice', async () => {
      const res = await asA('get', '/companies/current').expect(200);

      expect(res.body).toHaveProperty('data.id');
      expect(res.body).not.toHaveProperty('data.data');
    });

    it('never returns a password hash', async () => {
      const res = await asA('get', '/users').expect(200);
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|password_hash|\$2[aby]\$/);
    });

    it('answers an invalid body with 400 and field details, not 500', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ emailOrMobile: '', password: 'x' })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_FAILED');
      expect(res.body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'password' })]));
    });

    it('rejects a request with no bearer token', async () => {
      await request(app.getHttpServer()).get('/api/v1/companies').expect(401);
    });
  });

  describe('RBAC seed (ADM-06)', () => {
    it('exposes the 9 spec roles', async () => {
      const res = await asA('get', '/users/roles').expect(200);
      const codes = (res.body.data as Array<{ code: string }>).map((r) => r.code).sort();

      expect(codes).toEqual(
        [
          'accountant',
          'driver',
          'manager',
          'owner',
          'production_manager',
          'sales_executive',
          'store_keeper',
          'super_admin',
          'supervisor',
        ].sort(),
      );
    });

    it('grants the owner the permissions its routes require', async () => {
      const res = await asA('get', '/auth/me').expect(200);
      expect(res.body.data.permissions).toEqual(
        expect.arrayContaining(['company.view', 'company.manage', 'users.manage', 'audit.view']),
      );
    });
  });

  describe('audit trail (ADM-07)', () => {
    it('records the login and is readable by the Owner, scoped to the tenant', async () => {
      const res = await asA('get', '/audit-logs?limit=50').expect(200);

      expect(res.body.meta).toEqual(expect.objectContaining({ page: 1, limit: 50 }));
      const actions = (res.body.data as Array<{ action: string; companyId: string }>).map((r) => r.action);
      expect(actions).toContain('LOGIN');
      for (const row of res.body.data as Array<{ companyId: string }>) {
        expect(row.companyId).toBe(companyA.id);
      }
    });
  });
});
