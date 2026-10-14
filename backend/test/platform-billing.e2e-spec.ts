import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import * as bcrypt from 'bcryptjs';
import { DataSource, type EntityManager } from 'typeorm';
import type { TenantBillingInfoDto, PlatformInvoiceDto } from '@brics/shared';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';
import { seedRbac } from '../src/database/seeds/seed-rbac';
import { Role } from '../src/modules/auth/entities/role.entity';
import { User } from '../src/modules/auth/entities/user.entity';
import { UserCompany } from '../src/modules/auth/entities/user-company.entity';

jest.setTimeout(60_000);

describe('Platform Billing (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let platformToken: string;
  let ownerToken: string;
  let tenantId: string;
  const PREFIX = 'BillingSpec';
  const DOMAIN = 'billing.test';
  const PLATFORM_MOBILE = '9100000200';
  const OWNER_MOBILE = '9100000201';

  const reset = async () => {
    const companyScope = `SELECT id FROM "companies" WHERE "name" LIKE '${PREFIX} %'`;
    await dataSource.query(
      [
        `DELETE FROM "platform_invoices" WHERE "company_id" IN (${companyScope});`,
        `DELETE FROM "audit_logs" WHERE "company_id" IN (${companyScope});`,
        `DELETE FROM "ledgers" WHERE "company_id" IN (${companyScope});`,
        `DELETE FROM "ledger_groups" WHERE "company_id" IN (${companyScope});`,
        `DELETE FROM "financial_years" WHERE "company_id" IN (${companyScope});`,
        `DELETE FROM "user_companies" WHERE "user_id" IN (SELECT id FROM "users" WHERE "email" LIKE '%@${DOMAIN}' OR "mobile" LIKE '91000002%');`,
        `DELETE FROM "refresh_tokens" WHERE "user_id" IN (SELECT id FROM "users" WHERE "email" LIKE '%@${DOMAIN}' OR "mobile" LIKE '91000002%');`,
        `DELETE FROM "users" WHERE "email" LIKE '%@${DOMAIN}' OR "mobile" LIKE '91000002%';`,
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

    // Seed platform admin
    const platformRole = await dataSource.getRepository(Role).findOneByOrFail({ code: 'platform_admin' });
    const platformAdmin = await dataSource.getRepository(User).save(
      dataSource.getRepository(User).create({
        name: 'Billing Platform Admin',
        mobile: PLATFORM_MOBILE,
        email: `admin@${DOMAIN}`,
        passwordHash: await bcrypt.hash('secret123', 8),
        isActive: true,
      }),
    );
    const scaffoldCompany = await dataSource.query(
      `INSERT INTO "companies" ("name", "state_code", "status") VALUES ('${PREFIX} Scaffold', '09', 'active') RETURNING id`,
    );
    await dataSource.getRepository(UserCompany).save({
      userId: platformAdmin.id,
      companyId: scaffoldCompany[0].id,
      roleId: platformRole.id,
      isDefault: true,
    });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ emailOrMobile: `admin@${DOMAIN}`, password: 'secret123' })
      .expect(200);
    platformToken = (loginRes.body as { data: { accessToken: string } }).data.accessToken;

    // Onboard tenant company
    const onboardRes = await request(app.getHttpServer())
      .post('/api/v1/platform/tenants')
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        companyName: `${PREFIX} Brickworks`,
        stateCode: '09',
        planName: 'starter',
        ownerName: 'Vikas Owner',
        ownerMobile: OWNER_MOBILE,
        ownerEmail: `owner@${DOMAIN}`,
        ownerPassword: 'secretOwner123',
      })
      .expect(201);

    tenantId = (onboardRes.body as { data: { tenant: { id: string } } }).data.tenant.id;

    // Login as tenant owner
    const ownerLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ emailOrMobile: OWNER_MOBILE, password: 'secretOwner123' })
      .expect(200);
    ownerToken = (ownerLoginRes.body as { data: { accessToken: string } }).data.accessToken;
  });

  afterAll(async () => {
    await reset();
    await app.close();
  });

  it('GET /api/v1/platform/plans returns platform plans', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/platform/plans')
      .set('Authorization', `Bearer ${platformToken}`)
      .expect(200);

    const plans = (res.body as { data: Array<{ code: string }> }).data;
    expect(plans).toHaveLength(3);
    expect(plans.map((p) => p.code)).toContain('starter');
    expect(plans.map((p) => p.code)).toContain('growth');
  });

  it('GET /api/v1/platform/tenants/:id/billing returns tenant subscription info', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/platform/tenants/${tenantId}/billing`)
      .set('Authorization', `Bearer ${platformToken}`)
      .expect(200);

    const billing = (res.body as { data: TenantBillingInfoDto }).data;
    expect(billing.tenantId).toBe(tenantId);
    expect(billing.planName).toBe('starter');
    expect(billing.currentPlan?.code).toBe('starter');
    expect(billing.invoices).toEqual([]);
  });

  it('PATCH /api/v1/platform/tenants/:id/subscription updates subscription parameters', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/platform/tenants/${tenantId}/subscription`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        planName: 'growth',
        billingCycle: 'yearly',
        gracePeriodDays: 14,
      })
      .expect(200);

    const billing = (res.body as { data: TenantBillingInfoDto }).data;
    expect(billing.planName).toBe('growth');
    expect(billing.billingCycle).toBe('yearly');
    expect(billing.gracePeriodDays).toBe(14);
  });

  let createdInvoiceId: string;

  it('POST /api/v1/platform/tenants/:id/invoices generates platform invoice', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/platform/tenants/${tenantId}/invoices`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        planName: 'growth',
        billingCycle: 'yearly',
        amount: '59990.00',
        taxAmount: '10798.20',
        periodStart: '2026-10-01T00:00:00.000Z',
        periodEnd: '2027-09-30T23:59:59.000Z',
        dueDate: '2026-10-31',
        notes: 'Annual SaaS subscription',
      })
      .expect(201);

    const invoice = (res.body as { data: PlatformInvoiceDto }).data;
    expect(invoice.id).toBeDefined();
    expect(invoice.invoiceNumber).toMatch(/^INV-PLT-\d{6}-\d{4}$/);
    expect(invoice.amount).toBe('59990.00');
    expect(invoice.taxAmount).toBe('10798.20');
    expect(invoice.totalAmount).toBe('70788.20');
    expect(invoice.status).toBe('pending');
    createdInvoiceId = invoice.id;
  });

  it('POST /api/v1/platform/invoices/:id/record-payment records payment and marks invoice paid', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/platform/invoices/${createdInvoiceId}/record-payment`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        paymentMethod: 'bank_transfer',
        paymentRef: 'HDFC20261014001',
        notes: 'Received via RTGS',
      })
      .expect(200);

    const invoice = (res.body as { data: PlatformInvoiceDto }).data;
    expect(invoice.status).toBe('paid');
    expect(invoice.paymentMethod).toBe('bank_transfer');
    expect(invoice.paymentRef).toBe('HDFC20261014001');
    expect(invoice.paidAt).toBeDefined();
  });

  it('POST /api/v1/platform/billing/check-expiry runs evaluation job', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/platform/billing/check-expiry')
      .set('Authorization', `Bearer ${platformToken}`)
      .expect(200);

    const check = (res.body as { data: { checkedTenants: number } }).data;
    expect(check.checkedTenants).toBeGreaterThan(0);
  });

  it('GET /api/v1/companies/current/billing lets tenant owner view their billing & invoices', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/companies/current/billing')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const billing = (res.body as { data: TenantBillingInfoDto }).data;
    expect(billing.tenantId).toBe(tenantId);
    expect(billing.planName).toBe('growth');
    expect(billing.invoices).toHaveLength(1);
    expect(billing.invoices[0]?.status).toBe('paid');
  });
});
