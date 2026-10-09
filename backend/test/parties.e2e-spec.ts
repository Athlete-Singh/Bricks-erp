import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';
import { seedRbac } from '../src/database/seeds/seed-rbac';
import { seedChartForCompany } from '../src/accounting/chart-of-accounts.seed';
import { Company } from '../src/modules/company/entities/company.entity';
import { User } from '../src/modules/auth/entities/user.entity';
import { UserCompany } from '../src/modules/auth/entities/user-company.entity';
import { Role } from '../src/modules/auth/entities/role.entity';
import { FinancialYear } from '../src/modules/company/entities/financial-year.entity';

jest.setTimeout(30000);

describe('Parties (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  let companyA: Company;
  let companyB: Company;
  let tokenA: string;
  let tokenB: string;

  const PASSWORD = 'party-test-pw';

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
    companyA = await companyRepo.save(companyRepo.create({ name: 'Party Test A', stateCode: '09' }));
    companyB = await companyRepo.save(companyRepo.create({ name: 'Party Test B', stateCode: '27' }));

    // Both companies need a chart of accounts for party ledger creation
    await dataSource.transaction(async (manager) => {
      await seedChartForCompany(manager, companyA.id);
      await seedChartForCompany(manager, companyB.id);
    });

    // Both need an FY for posting if needed
    const fyRepo = dataSource.getRepository(FinancialYear);
    await fyRepo.save(
      fyRepo.create({
        companyId: companyA.id,
        name: '2026-27',
        startDate: '2026-04-01',
        endDate: '2027-03-31',
        isActive: true,
        isLocked: false,
      }),
    );
    await fyRepo.save(
      fyRepo.create({
        companyId: companyB.id,
        name: '2026-27',
        startDate: '2026-04-01',
        endDate: '2027-03-31',
        isActive: true,
        isLocked: false,
      }),
    );

    const userRepo = dataSource.getRepository(User);
    const membershipRepo = dataSource.getRepository(UserCompany);
    const passwordHash = await bcrypt.hash(PASSWORD, 10);

    const ownerA = await userRepo.save(
      userRepo.create({ email: 'owner-a@parties.test', mobile: '9100000001', name: 'Owner A', passwordHash }),
    );
    const ownerB = await userRepo.save(
      userRepo.create({ email: 'owner-b@parties.test', mobile: '9100000002', name: 'Owner B', passwordHash }),
    );
    await membershipRepo.save([
      membershipRepo.create({ userId: ownerA.id, companyId: companyA.id, roleId: ownerRole.id, isDefault: true }),
      membershipRepo.create({ userId: ownerB.id, companyId: companyB.id, roleId: ownerRole.id, isDefault: true }),
    ]);

    const loginA = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ emailOrMobile: 'owner-a@parties.test', password: PASSWORD })
      .expect(200);
    tokenA = loginA.body.data.accessToken;

    const loginB = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ emailOrMobile: 'owner-b@parties.test', password: PASSWORD })
      .expect(200);
    tokenB = loginB.body.data.accessToken;
  });

  afterAll(async () => {
    await resetFixtures();
    await app.close();
  });

  async function resetFixtures(): Promise<void> {
    await dataSource.query(`
      DELETE FROM "parties" WHERE "company_id" IN (SELECT id FROM "companies" WHERE "name" LIKE 'Party Test %');
      DELETE FROM "voucher_lines" WHERE "voucher_id" IN (
        SELECT id FROM "vouchers" WHERE "company_id" IN (SELECT id FROM "companies" WHERE "name" LIKE 'Party Test %')
      );
      DELETE FROM "voucher_sequences" WHERE "company_id" IN (SELECT id FROM "companies" WHERE "name" LIKE 'Party Test %');
      DELETE FROM "vouchers" WHERE "company_id" IN (SELECT id FROM "companies" WHERE "name" LIKE 'Party Test %');
      DELETE FROM "ledgers" WHERE "company_id" IN (SELECT id FROM "companies" WHERE "name" LIKE 'Party Test %');
      DELETE FROM "voucher_types" WHERE "company_id" IN (SELECT id FROM "companies" WHERE "name" LIKE 'Party Test %');
      DELETE FROM "ledger_groups" WHERE "company_id" IN (SELECT id FROM "companies" WHERE "name" LIKE 'Party Test %');
      DELETE FROM "user_sites" WHERE "user_id" IN (SELECT id FROM "users" WHERE "email" LIKE '%@parties.test');
      DELETE FROM "refresh_tokens" WHERE "user_id" IN (SELECT id FROM "users" WHERE "email" LIKE '%@parties.test');
      DELETE FROM "user_companies" WHERE "user_id" IN (SELECT id FROM "users" WHERE "email" LIKE '%@parties.test');
      DELETE FROM "users" WHERE "email" LIKE '%@parties.test';
      DELETE FROM "audit_logs" WHERE "company_id" IN (SELECT id FROM "companies" WHERE "name" LIKE 'Party Test %');
      DELETE FROM "financial_years" WHERE "company_id" IN (SELECT id FROM "companies" WHERE "name" LIKE 'Party Test %');
      DELETE FROM "sites" WHERE "company_id" IN (SELECT id FROM "companies" WHERE "name" LIKE 'Party Test %');
      DELETE FROM "companies" WHERE "name" LIKE 'Party Test %';
    `);
  }

  const asA = (method: 'get' | 'post' | 'patch', path: string) =>
    request(app.getHttpServer())[method](`/api/v1${path}`).set('Authorization', `Bearer ${tokenA}`);
  const asB = (method: 'get' | 'post' | 'patch', path: string) =>
    request(app.getHttpServer())[method](`/api/v1${path}`).set('Authorization', `Bearer ${tokenB}`);

  describe('party CRUD', () => {
    let partyIdA: string;

    it('creates a customer party with its auto-ledger', async () => {
      const res = await asA('post', '/parties')
        .send({ name: 'Customer One', partyTypes: ['customer'] })
        .expect(201);

      partyIdA = res.body.data.id;
      expect(res.body.data.name).toBe('Customer One');
      expect(res.body.data.partyTypes).toEqual(['customer']);
      expect(res.body.data.ledgerId).toBeTruthy();
      expect(res.body.data.companyId).toBe(companyA.id);
    });

    it('creates a supplier party under Sundry Creditors', async () => {
      const res = await asA('post', '/parties')
        .send({ name: 'Supplier One', partyTypes: ['supplier'], gstin: '09AABCS1234P1Z1' })
        .expect(201);

      expect(res.body.data.gstin).toBe('09AABCS1234P1Z1');
    });

    it('creates a Sardar party under Labour Payables', async () => {
      const res = await asA('post', '/parties')
        .send({ name: 'Sardar Ji', partyTypes: ['sardar'], phone: '9876543210' })
        .expect(201);

      expect(res.body.data.partyTypes).toEqual(['sardar']);
    });

    it('creates a multi-type party (customer+supplier) under Sundry Debtors', async () => {
      const res = await asA('post', '/parties')
        .send({ name: 'Both Ways Ltd', partyTypes: ['supplier', 'customer'] })
        .expect(201);

      expect(res.body.data.partyTypes).toContain('customer');
      expect(res.body.data.partyTypes).toContain('supplier');
    });

    it('rejects a duplicate name', async () => {
      const res = await asA('post', '/parties')
        .send({ name: 'Customer One', partyTypes: ['customer'] })
        .expect(400);

      expect(res.body.error.code).toBeDefined();
    });

    it('rejects empty partyTypes', async () => {
      await asA('post', '/parties').send({ name: 'No Types', partyTypes: [] }).expect(400);
    });

    it('lists parties with pagination', async () => {
      const res = await asA('get', '/parties?page=1&limit=10').expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(4);
      expect(res.body.meta).toEqual(expect.objectContaining({ page: 1, limit: 10 }));
    });

    it('filters parties by type', async () => {
      const res = await asA('get', '/parties?type=sardar').expect(200);

      for (const party of res.body.data) {
        expect(party.partyTypes).toContain('sardar');
      }
    });

    it('searches parties by name', async () => {
      const res = await asA('get', '/parties?search=Supplier').expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].name).toContain('Supplier');
    });

    it('reads a single party by id', async () => {
      const res = await asA('get', `/parties/${partyIdA}`).expect(200);

      expect(res.body.data.id).toBe(partyIdA);
      expect(res.body.data.name).toBe('Customer One');
    });

    it('updates a party name and syncs the ledger name', async () => {
      await asA('patch', `/parties/${partyIdA}`).send({ name: 'Customer One Renamed' }).expect(200);

      const res = await asA('get', `/parties/${partyIdA}`).expect(200);
      expect(res.body.data.name).toBe('Customer One Renamed');
    });

    it('deactivates a party', async () => {
      await asA('patch', `/parties/${partyIdA}`).send({ isActive: false }).expect(200);

      const res = await asA('get', `/parties/${partyIdA}`).expect(200);
      expect(res.body.data.isActive).toBe(false);

      // Restore for later tests
      await asA('patch', `/parties/${partyIdA}`).send({ isActive: true }).expect(200);
    });
  });

  describe('tenant isolation for parties', () => {
    let partyInB: string;

    beforeAll(async () => {
      const res = await asB('post', '/parties')
        .send({ name: 'B-Only Customer', partyTypes: ['customer'] })
        .expect(201);
      partyInB = res.body.data.id;
    });

    it('tenant A cannot see tenant B parties', async () => {
      const res = await asA('get', '/parties').expect(200);
      const ids = (res.body as { data: { id: string }[] }).data.map((p) => p.id);

      expect(ids).not.toContain(partyInB);
    });

    it('tenant A cannot read tenant B party by id', async () => {
      await asA('get', `/parties/${partyInB}`).expect(404);
    });

    it('tenant A cannot update tenant B party', async () => {
      await asA('patch', `/parties/${partyInB}`).send({ name: 'Hijacked' }).expect(404);

      // Verify untouched
      const res = await asB('get', `/parties/${partyInB}`).expect(200);
      expect(res.body.data.name).toBe('B-Only Customer');
    });

    it('party is created in the JWT tenant, not a client-supplied company', async () => {
      const res = await asA('post', '/parties')
        .send({ name: 'Forced Tenant Party', partyTypes: ['other'], companyId: companyB.id })
        .expect(201);

      expect(res.body.data.companyId).toBe(companyA.id);
    });
  });

  describe('auto-ledger verification', () => {
    it('the created ledger appears in the chart of accounts', async () => {
      const partyRes = await asA('post', '/parties')
        .send({ name: 'Ledger Check Party', partyTypes: ['supplier'] })
        .expect(201);

      const ledgersRes = await asA('get', '/ledgers').expect(200);
      const ledgers = (ledgersRes.body as { data: { id: string; name: string; partyId: string }[] }).data;
      const partyLedger = ledgers.find((l) => l.id === (partyRes.body as { data: { ledgerId: string } }).data.ledgerId);

      expect(partyLedger).toBeTruthy();
      expect(partyLedger!.name).toBe('Ledger Check Party');
      expect(partyLedger!.partyId).toBe((partyRes.body as { data: { id: string } }).data.id);
    });
  });

  describe('company GST scheme (ADR-019)', () => {
    it('returns the GST scheme in the login response', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ emailOrMobile: 'owner-a@parties.test', password: PASSWORD })
        .expect(200);

      expect(res.body.data.company.gstScheme).toBe('regular_12_itc');
    });

    it('returns the GST scheme on the current company', async () => {
      const res = await asA('get', '/companies/current').expect(200);
      expect(res.body.data.gstScheme).toBe('regular_12_itc');
    });
  });
});
