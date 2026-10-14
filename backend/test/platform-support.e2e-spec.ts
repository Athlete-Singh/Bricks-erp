import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import * as bcrypt from 'bcryptjs';
import { DataSource, type EntityManager } from 'typeorm';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';
import { seedRbac } from '../src/database/seeds/seed-rbac';
import { Role } from '../src/modules/auth/entities/role.entity';
import { User } from '../src/modules/auth/entities/user.entity';
import { UserCompany } from '../src/modules/auth/entities/user-company.entity';

jest.setTimeout(120_000);

/**
 * S2.1 — the full support-session walk, end to end:
 *   1. Platform admin signs in; a request to a business endpoint of the
 *      tenant is refused (no permission, no bypass — ADR-052).
 *   2. Admin opens a session against the tenant. The response carries a
 *      switched auth bundle with owner permissions and a
 *      `supportSessionId` claim.
 *   3. A read on `/vouchers` now succeeds and leaves an audit row stamped
 *      `platform_support` with the session id.
 *   4. Admin closes the session; the switched tokens become 401.
 *   5. The owner's audit viewer lists the support entry marked as such.
 */
describe('Platform support sessions (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let platformToken: string;
  let ownerToken: string;
  let tenantId: string;
  const PREFIX = 'SupportSpec';
  const DOMAIN = 'support.test';
  const PLATFORM_MOBILE = '9200000100';

  const reset = async () => {
    const scope = `SELECT id FROM "companies" WHERE "name" LIKE '${PREFIX} %'`;
    await dataSource.query(
      [
        `DELETE FROM "audit_logs" WHERE "company_id" IN (${scope});`,
        `DELETE FROM "support_sessions" WHERE "company_id" IN (${scope});`,
        `DELETE FROM "ledgers" WHERE "company_id" IN (${scope});`,
        `DELETE FROM "ledger_groups" WHERE "company_id" IN (${scope});`,
        `DELETE FROM "financial_years" WHERE "company_id" IN (${scope});`,
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

    const platformRole = await dataSource.getRepository(Role).findOneByOrFail({ code: 'platform_admin' });
    const admin = await dataSource.getRepository(User).save(
      dataSource.getRepository(User).create({
        email: `admin@${DOMAIN}`,
        mobile: `${PLATFORM_MOBILE}0`,
        name: 'Platform Admin',
        passwordHash: await bcrypt.hash('platform-pw', 10),
        isActive: true,
        isSuperAdmin: false,
      }),
    );
    // Scaffold company so sign-in resolves a session — the admin never acts
    // in this company (no business permissions). Same scaffold the S1.1 e2e
    // uses.
    const scaffold = await dataSource.query(
      `INSERT INTO "companies" ("name", "state_code", "status") VALUES ('${PREFIX} Scaffold', '09', 'active') RETURNING id`,
    );
    await dataSource.getRepository(UserCompany).save({
      userId: admin.id,
      companyId: scaffold[0].id,
      roleId: platformRole.id,
      isDefault: true,
    });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ emailOrMobile: `admin@${DOMAIN}`, password: 'platform-pw' })
      .expect(200);
    platformToken = loginRes.body.data.accessToken;

    // Onboard a tenant via S1.1's own endpoint — gives us a tenant with an
    // owner (who holds all business permissions) and the chart + FY ready.
    const onboardRes = await request(app.getHttpServer())
      .post('/api/v1/platform/tenants')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        companyName: `${PREFIX} Alpha`,
        stateCode: '09',
        ownerName: 'Alpha Owner',
        ownerMobile: `${PLATFORM_MOBILE}1`,
        ownerEmail: `alpha-owner@${DOMAIN}`,
        ownerPassword: 'alpha-pw-123',
      })
      .expect(201);
    tenantId = onboardRes.body.data.tenant.id;

    const ownerLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ emailOrMobile: `alpha-owner@${DOMAIN}`, password: 'alpha-pw-123' })
      .expect(200);
    ownerToken = ownerLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await reset();
    await app.close();
  });

  it('a platform admin without a session is refused on a business endpoint', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/vouchers')
      .set('Authorization', `Bearer ${platformToken}`)
      .expect(403);
  });

  it("opens a session, acts as owner on the tenant's vouchers, and stamps the audit row", async () => {
    const openRes = await request(app.getHttpServer())
      .post('/api/v1/platform/support-sessions')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ tenantId, reason: 'customer called asking why an invoice looked wrong' })
      .expect(201);

    const sessionId = openRes.body.data.session.id as string;
    const supportToken = openRes.body.data.auth.accessToken as string;
    expect(openRes.body.data.auth.user.roleCode).toBe('platform_support');
    expect(openRes.body.data.auth.company.id).toBe(tenantId);

    // Business endpoint now works — the admin reads as owner.
    const list = await request(app.getHttpServer())
      .get('/api/v1/vouchers')
      .set('Authorization', `Bearer ${supportToken}`)
      .expect(200);
    expect(Array.isArray(list.body.data)).toBe(true);

    // The audit trail picked that up and marked it as support's work.
    const rows = await dataSource.query(
      `SELECT actor_kind, support_session_id FROM "audit_logs"
         WHERE "company_id" = $1 AND "support_session_id" = $2
         ORDER BY "created_at" DESC`,
      [tenantId, sessionId],
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].actor_kind).toBe('platform_support');

    // A second open against the same tenant is refused — one open at a time.
    await request(app.getHttpServer())
      .post('/api/v1/platform/support-sessions')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ tenantId, reason: 'another look' })
      .expect(409);

    // Closing on this admin's token works; the switched support token stops working.
    await request(app.getHttpServer())
      .post(`/api/v1/platform/support-sessions/${sessionId}/close`)
      .set('Authorization', `Bearer ${platformToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/vouchers')
      .set('Authorization', `Bearer ${supportToken}`)
      .expect(401);

    // Idempotent close — a second request is a no-op (still 200).
    await request(app.getHttpServer())
      .post(`/api/v1/platform/support-sessions/${sessionId}/close`)
      .set('Authorization', `Bearer ${platformToken}`)
      .expect(200);
  });

  it('refuses an open with a one-character reason — making somebody type one is the control', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/platform/support-sessions')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ tenantId, reason: 'x' })
      .expect(400);
  });

  it("the owner's audit viewer lists support's entries marked as such", async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const supportRows = (res.body.data as Array<{ actorKind: string }>).filter(
      (r) => r.actorKind === 'platform_support',
    );
    expect(supportRows.length).toBeGreaterThan(0);
  });

  describe('PLT-10 (S3.2) — per-tenant support approval requirement', () => {
    it('blocks support access when requireSupportApproval is enabled until owner grants access', async () => {
      // 1. Platform admin enables requireSupportApproval for tenant
      await request(app.getHttpServer())
        .patch(`/api/v1/platform/tenants/${tenantId}/settings`)
        .set('Authorization', `Bearer ${platformToken}`)
        .send({ requireSupportApproval: true })
        .expect(200);

      // 2. Opening session without approval is 403
      const blockedRes = await request(app.getHttpServer())
        .post('/api/v1/platform/support-sessions')
        .set('Authorization', `Bearer ${platformToken}`)
        .send({ tenantId, reason: 'attempting support without approval' })
        .expect(403);
      expect(blockedRes.body.error.message).toContain('SUPPORT_APPROVAL_REQUIRED');

      // 3. Owner grants temporary support access
      const grantRes = await request(app.getHttpServer())
        .post('/api/v1/companies/current/grant-support-access')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ durationHours: 2 })
        .expect(201);
      expect(grantRes.body.data.code).toHaveLength(6);
      expect(grantRes.body.data.grantedUntil).toBeDefined();

      // 4. Platform admin can now open a support session
      const openRes = await request(app.getHttpServer())
        .post('/api/v1/platform/support-sessions')
        .set('Authorization', `Bearer ${platformToken}`)
        .send({ tenantId, reason: 'authorized support session' })
        .expect(201);
      const newSessionId = openRes.body.data.session.id;

      // Close session
      await request(app.getHttpServer())
        .post(`/api/v1/platform/support-sessions/${newSessionId}/close`)
        .set('Authorization', `Bearer ${platformToken}`)
        .expect(200);

      // 5. Owner revokes support access
      await request(app.getHttpServer())
        .post('/api/v1/companies/current/revoke-support-access')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(201);

      // 6. Access is blocked again
      await request(app.getHttpServer())
        .post('/api/v1/platform/support-sessions')
        .set('Authorization', `Bearer ${platformToken}`)
        .send({ tenantId, reason: 'attempting support after revocation' })
        .expect(403);

      // Reset setting
      await request(app.getHttpServer())
        .patch(`/api/v1/platform/tenants/${tenantId}/settings`)
        .set('Authorization', `Bearer ${platformToken}`)
        .send({ requireSupportApproval: false })
        .expect(200);
    });
  });
});
