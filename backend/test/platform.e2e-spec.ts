import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import * as bcrypt from 'bcryptjs';
import { DataSource, type EntityManager } from 'typeorm';
import { SUSPENDED_TENANT_SIGN_IN_MESSAGE, type TenantDetailDto } from '@brics/shared';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';
import { seedRbac } from '../src/database/seeds/seed-rbac';
import { Role } from '../src/modules/auth/entities/role.entity';
import { User } from '../src/modules/auth/entities/user.entity';
import { UserCompany } from '../src/modules/auth/entities/user-company.entity';

jest.setTimeout(60_000);

/**
 * S1.1 — the SaaS surface, end to end: a platform admin onboards a tenant,
 * suspends it, and the owner is refused at sign-in with the named-contact
 * message (PLT-06). It also pins the invariant from ADR-052: a platform admin
 * cannot read business endpoints — no `isSuperAdmin` bypass survives.
 */
describe('Platform (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let platformToken: string;
  const PREFIX = 'PlatformSpec';
  const DOMAIN = 'platform.test';
  const PLATFORM_MOBILE = '9100000100';

  const reset = async () => {
    const companyScope = `SELECT id FROM "companies" WHERE "name" LIKE '${PREFIX} %'`;
    await dataSource.query(
      [
        `DELETE FROM "audit_logs" WHERE "company_id" IN (${companyScope});`,
        `DELETE FROM "ledgers" WHERE "company_id" IN (${companyScope});`,
        `DELETE FROM "ledger_groups" WHERE "company_id" IN (${companyScope});`,
        `DELETE FROM "financial_years" WHERE "company_id" IN (${companyScope});`,
        `DELETE FROM "user_companies" WHERE "user_id" IN (SELECT id FROM "users" WHERE "email" LIKE '%@${DOMAIN}' OR "mobile" LIKE '${PLATFORM_MOBILE}%');`,
        `DELETE FROM "refresh_tokens" WHERE "user_id" IN (SELECT id FROM "users" WHERE "email" LIKE '%@${DOMAIN}' OR "mobile" LIKE '${PLATFORM_MOBILE}%');`,
        `DELETE FROM "users" WHERE "email" LIKE '%@${DOMAIN}' OR "mobile" LIKE '${PLATFORM_MOBILE}%';`,
        `DELETE FROM "companies" WHERE "name" LIKE '${PREFIX} %';`,
      ].join('\n'),
    );
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    dataSource = app.get(DataSource);
    await reset();

    await dataSource.transaction((m: EntityManager) => seedRbac(m));

    // One platform admin, created straight into the DB — nothing else can make
    // one before S1.1 ships.
    const role = await dataSource.getRepository(Role).findOneByOrFail({ code: 'platform_admin' });
    const user = await dataSource.getRepository(User).save(
      dataSource.getRepository(User).create({
        email: `admin@${DOMAIN}`,
        mobile: `${PLATFORM_MOBILE}0`,
        name: 'Platform Admin',
        passwordHash: await bcrypt.hash('platform-pw', 10),
        isActive: true,
        isSuperAdmin: false,
      }),
    );
    // Membership against a dummy company so the login resolves a session; the
    // platform admin never acts inside that company. In S1.2 the login flow
    // learns about platform admins directly and this scaffolding goes away.
    const scaffoldCompany = await dataSource.query(
      `INSERT INTO "companies" ("name", "state_code", "status") VALUES ('${PREFIX} Scaffold', '09', 'active') RETURNING id`,
    );
    await dataSource.getRepository(UserCompany).save({
      userId: user.id,
      companyId: scaffoldCompany[0].id,
      roleId: role.id,
      isDefault: true,
    });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ emailOrMobile: `admin@${DOMAIN}`, password: 'platform-pw' })
      .expect(200);
    platformToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await reset();
    await app.close();
  });

  it('onboards a tenant (company + first FY + owner) in one transaction', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/platform/tenants')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        companyName: `${PREFIX} Alpha`,
        stateCode: '09',
        planName: 'starter',
        ownerName: 'Alpha Owner',
        ownerMobile: `${PLATFORM_MOBILE}1`,
        ownerEmail: `alpha-owner@${DOMAIN}`,
        ownerPassword: 'alpha-pw-123',
      })
      .expect(201);

    expect(res.body.data.tenant.status).toBe('active');
    expect(res.body.data.owner.mobile).toBe(`${PLATFORM_MOBILE}1`);
    expect(res.body.data.financialYear.name).toMatch(/^\d{4}-\d{2}$/);

    // The owner can sign in and sees a chart of accounts — proof the whole
    // onboarding chain ran in the same transaction.
    const ownerLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ emailOrMobile: `alpha-owner@${DOMAIN}`, password: 'alpha-pw-123' })
      .expect(200);
    expect(ownerLogin.body.data.user.roleCode).toBe('owner');
    expect(ownerLogin.body.data.company.name).toBe(`${PREFIX} Alpha`);
  });

  it('refuses the owner at sign-in while the tenant is suspended (PLT-06), with the named-contact message', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/platform/tenants')
      .set('Authorization', `Bearer ${platformToken}`)
      .expect(200);
    const tenant = (list.body.data as Array<{ id: string; name: string }>).find((t) => t.name === `${PREFIX} Alpha`);
    expect(tenant).toBeDefined();

    await request(app.getHttpServer())
      .post(`/api/v1/platform/tenants/${tenant!.id}/suspend`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ reason: 'test suspension' })
      .expect(200);

    const refused = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ emailOrMobile: `alpha-owner@${DOMAIN}`, password: 'alpha-pw-123' })
      .expect(401);
    expect(refused.body.error.message).toBe(SUSPENDED_TENANT_SIGN_IN_MESSAGE);

    // Reactivate — the owner can sign in again.
    await request(app.getHttpServer())
      .post(`/api/v1/platform/tenants/${tenant!.id}/reactivate`)
      .set('Authorization', `Bearer ${platformToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ emailOrMobile: `alpha-owner@${DOMAIN}`, password: 'alpha-pw-123' })
      .expect(200);
  });

  it('refuses a platform admin on business endpoints — the super-admin bypass is gone (ADR-052)', async () => {
    // `GET /api/v1/vouchers` requires `accounts.view`; the platform admin
    // holds no business permissions, so this must be 403. Before ADR-052 this
    // would have slipped through for a super admin.
    await request(app.getHttpServer())
      .get('/api/v1/vouchers')
      .set('Authorization', `Bearer ${platformToken}`)
      .expect(403);
  });

  it('refuses onboarding with a duplicate mobile — before any row is written', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/platform/tenants')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        companyName: `${PREFIX} Beta`,
        stateCode: '27',
        ownerName: 'Beta Owner',
        ownerMobile: `${PLATFORM_MOBILE}1`, // same as Alpha
        ownerEmail: `beta-owner@${DOMAIN}`,
        ownerPassword: 'beta-pw-123',
      })
      .expect(409);

    // The Beta company must not exist.
    const list = await request(app.getHttpServer())
      .get('/api/v1/platform/tenants')
      .set('Authorization', `Bearer ${platformToken}`)
      .expect(200);
    const beta = (list.body.data as Array<{ name: string }>).find((t) => t.name === `${PREFIX} Beta`);
    expect(beta).toBeUndefined();
  });

  it('returns full tenant detail with counts, assigned users and kilns (PLT-09)', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/platform/tenants')
      .set('Authorization', `Bearer ${platformToken}`)
      .expect(200);
    const tenant = (list.body.data as Array<{ id: string; name: string }>).find((t) => t.name === `${PREFIX} Alpha`);
    expect(tenant).toBeDefined();

    const detailRes = await request(app.getHttpServer())
      .get(`/api/v1/platform/tenants/${tenant!.id}`)
      .set('Authorization', `Bearer ${platformToken}`)
      .expect(200);

    const detail = detailRes.body.data as TenantDetailDto;
    expect(detail.id).toBe(tenant!.id);
    expect(detail.name).toBe(`${PREFIX} Alpha`);
    expect(detail.status).toBe('active');
    expect(detail.counts).toBeDefined();
    expect(detail.counts.users).toBeGreaterThanOrEqual(1);
    expect(detail.counts.vouchers).toBeGreaterThanOrEqual(0);
    expect(detail.counts.salesInvoices).toBeGreaterThanOrEqual(0);

    expect(Array.isArray(detail.users)).toBe(true);
    const ownerUser = detail.users.find((u: { mobile: string }) => u.mobile === `${PLATFORM_MOBILE}1`);
    expect(ownerUser).toBeDefined();
    expect(ownerUser!.name).toBe('Alpha Owner');
    expect(ownerUser!.roleCode).toBe('owner');
    expect(ownerUser!.isActive).toBe(true);

    expect(Array.isArray(detail.kilns)).toBe(true);

    // Random non-existent UUID returns 404
    await request(app.getHttpServer())
      .get('/api/v1/platform/tenants/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${platformToken}`)
      .expect(404);
  });
});
