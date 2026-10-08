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
import { FinancialYear } from '../src/modules/company/entities/financial-year.entity';
import { Ledger } from '../src/accounting/entities/ledger.entity';
import { Role } from '../src/modules/auth/entities/role.entity';
import { User } from '../src/modules/auth/entities/user.entity';
import { UserCompany } from '../src/modules/auth/entities/user-company.entity';

interface TrialBalanceBody {
  rows: Array<{ ledgerName: string; closingDebit: string; closingCredit: string; openingDebit: string }>;
  totals: { closingDebit: string; closingCredit: string };
  isBalanced: boolean;
  difference: string;
}

interface StatementBody {
  opening: { debit: string; credit: string };
  rows: Array<{ number: string; debit: string; credit: string; runningBalance: string }>;
  totals: { debit: string; credit: string };
  closing: { debit: string; credit: string };
}

/**
 * The books against a real PostgreSQL (ACC-05).
 *
 * These are arithmetic over real journals, so they are worth proving end to end
 * rather than against a mock: post known entries, then assert the numbers the
 * owner would read.
 */
describe('Books: Day Book, Ledger, Trial Balance (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let token: string;
  let companyId: string;
  let cashId: string;
  let salesId: string;
  let capitalLedgerId: string;

  const PASSWORD = 'books-owner-pw';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();

    dataSource = app.get(DataSource);
    await resetFixtures();

    await dataSource.transaction((manager) => seedRbac(manager));
    const ownerRole = await dataSource.getRepository(Role).findOneByOrFail({ code: 'owner' });

    const company = await dataSource
      .getRepository(Company)
      .save(dataSource.getRepository(Company).create({ name: 'Books Test Bricks', stateCode: '09' }));
    companyId = company.id;
    await dataSource.transaction((manager) => seedChartForCompany(manager, companyId));

    await dataSource.getRepository(FinancialYear).save(
      dataSource.getRepository(FinancialYear).create({
        companyId,
        name: '2026-27',
        startDate: '2026-04-01',
        endDate: '2027-03-31',
        isActive: true,
      }),
    );

    const user = await dataSource.getRepository(User).save(
      dataSource.getRepository(User).create({
        email: 'owner@books.test',
        mobile: '9600000001',
        name: 'Books Owner',
        passwordHash: await bcrypt.hash(PASSWORD, 10),
      }),
    );
    await dataSource
      .getRepository(UserCompany)
      .save(
        dataSource
          .getRepository(UserCompany)
          .create({ userId: user.id, companyId, roleId: ownerRole.id, isDefault: true }),
      );

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ emailOrMobile: 'owner@books.test', password: PASSWORD })
      .expect(200);
    token = (login.body as { data: { accessToken: string } }).data.accessToken;

    const ledgerRepo = dataSource.getRepository(Ledger);
    cashId = (await ledgerRepo.findOneByOrFail({ companyId, code: 'CASH' })).id;
    salesId = (await ledgerRepo.findOneByOrFail({ companyId, code: 'SALES_BRICKS' })).id;
    capitalLedgerId = (await ledgerRepo.findOneByOrFail({ companyId, code: 'OPENING_DIFFERENCE' })).id;

    // A known set of journals to report on.
    await post('/vouchers').send(journal('2026-05-10', '10000.00')).expect(201);
    await post('/vouchers').send(journal('2026-05-20', '5000.00')).expect(201);
    await post('/vouchers').send(journal('2026-06-05', '2500.00')).expect(201);
  });

  afterAll(async () => {
    await resetFixtures();
    await app.close();
  });

  async function resetFixtures(): Promise<void> {
    await dataSource.query(`
      DELETE FROM "voucher_lines" WHERE "company_id" IN (SELECT id FROM "companies" WHERE "name" LIKE 'Books Test%');
      DELETE FROM "voucher_sequences" WHERE "company_id" IN (SELECT id FROM "companies" WHERE "name" LIKE 'Books Test%');
      DELETE FROM "vouchers" WHERE "company_id" IN (SELECT id FROM "companies" WHERE "name" LIKE 'Books Test%');
      DELETE FROM "ledgers" WHERE "company_id" IN (SELECT id FROM "companies" WHERE "name" LIKE 'Books Test%');
      DELETE FROM "ledger_groups" WHERE "company_id" IN (SELECT id FROM "companies" WHERE "name" LIKE 'Books Test%');
      DELETE FROM "voucher_types" WHERE "company_id" IN (SELECT id FROM "companies" WHERE "name" LIKE 'Books Test%');
      DELETE FROM "user_companies" WHERE "user_id" IN (SELECT id FROM "users" WHERE "email" LIKE '%@books.test');
      DELETE FROM "refresh_tokens" WHERE "user_id" IN (SELECT id FROM "users" WHERE "email" LIKE '%@books.test');
      DELETE FROM "audit_logs" WHERE "company_id" IN (SELECT id FROM "companies" WHERE "name" LIKE 'Books Test%');
      DELETE FROM "users" WHERE "email" LIKE '%@books.test';
      DELETE FROM "financial_years" WHERE "company_id" IN (SELECT id FROM "companies" WHERE "name" LIKE 'Books Test%');
      DELETE FROM "companies" WHERE "name" LIKE 'Books Test%';
    `);
  }

  function post(path: string) {
    return request(app.getHttpServer()).post(`/api/v1${path}`).set('Authorization', `Bearer ${token}`);
  }
  function get(path: string) {
    return request(app.getHttpServer()).get(`/api/v1${path}`).set('Authorization', `Bearer ${token}`);
  }

  /** Cash sale: debit Cash, credit Sales. */
  function journal(date: string, amount: string) {
    return {
      voucherType: 'receipt',
      voucherDate: date,
      narration: `Cash sale ${amount}`,
      lines: [
        { ledgerId: cashId, debit: amount },
        { ledgerId: salesId, credit: amount },
      ],
    };
  }

  describe('Day Book', () => {
    it('lists vouchers with their entries, newest first', async () => {
      const res = await get('/reports/day-book?from=2026-04-01&to=2027-03-31').expect(200);
      const items = (res.body as { data: Array<{ voucherDate: string; lines: unknown[]; totalDebit: string }> }).data;

      expect(items.length).toBeGreaterThanOrEqual(3);
      const dates = items.map((i) => i.voucherDate);
      expect([...dates].sort().reverse()).toEqual(dates);
      expect(items[0]?.lines).toHaveLength(2);
    });

    it('shows each voucher value as its debit total', async () => {
      const res = await get('/reports/day-book?from=2026-06-01&to=2026-06-30').expect(200);
      const items = (res.body as { data: Array<{ totalDebit: string }> }).data;

      expect(items).toHaveLength(1);
      expect(items[0]?.totalDebit).toBe('2500.00');
    });

    it('narrows to a date range', async () => {
      const res = await get('/reports/day-book?from=2026-05-01&to=2026-05-31').expect(200);
      expect((res.body as { data: unknown[] }).data).toHaveLength(2);
    });

    it('pages', async () => {
      const res = await get('/reports/day-book?limit=2').expect(200);
      const body = res.body as { data: unknown[]; meta: { limit: number; total: number } };

      expect(body.data).toHaveLength(2);
      expect(body.meta.total).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Ledger statement', () => {
    it('runs a balance down the page', async () => {
      const res = await get(`/reports/ledgers/${cashId}?from=2026-04-01&to=2027-03-31`).expect(200);
      const body = (res.body as { data: StatementBody }).data;

      // Cash was debited 10000, then 5000, then 2500.
      expect(body.rows.map((r) => r.runningBalance)).toEqual(['10000.00', '15000.00', '17500.00']);
      expect(body.totals.debit).toBe('17500.00');
      expect(body.closing).toEqual({ debit: '17500.00', credit: '0.00' });
    });

    it('treats entries before the range as opening, not as rows', async () => {
      const res = await get(`/reports/ledgers/${cashId}?from=2026-06-01&to=2026-06-30`).expect(200);
      const body = (res.body as { data: StatementBody }).data;

      // The two May entries are folded into the opening balance.
      expect(body.opening).toEqual({ debit: '15000.00', credit: '0.00' });
      expect(body.rows).toHaveLength(1);
      expect(body.closing.debit).toBe('17500.00');
    });

    it('shows a credit balance on an income ledger as positive, not negative', async () => {
      // Sales is credit-natured: 17500 credited is a 17500 balance, not -17500.
      const res = await get(`/reports/ledgers/${salesId}?from=2026-04-01&to=2027-03-31`).expect(200);
      const body = (res.body as { data: StatementBody }).data;

      expect(body.rows.at(-1)?.runningBalance).toBe('17500.00');
      expect(body.closing).toEqual({ debit: '0.00', credit: '17500.00' });
    });

    it('refuses a ledger from another company', async () => {
      const other = await dataSource
        .getRepository(Company)
        .save(dataSource.getRepository(Company).create({ name: 'Books Test Other', stateCode: '27' }));
      await dataSource.transaction((manager) => seedChartForCompany(manager, other.id));
      const foreign = await dataSource.getRepository(Ledger).findOneByOrFail({ companyId: other.id, code: 'CASH' });

      await get(`/reports/ledgers/${foreign.id}`).expect(404);
    });
  });

  describe('Trial Balance', () => {
    it('balances when every entry came through the posting engine', async () => {
      const res = await get('/reports/trial-balance?asOf=2027-03-31').expect(200);
      const body = (res.body as { data: TrialBalanceBody }).data;

      expect(body.totals.closingDebit).toBe(body.totals.closingCredit);
      expect(body.isBalanced).toBe(true);
      expect(body.difference).toBe('0.00');
    });

    it('puts each balance on its natural side', async () => {
      const res = await get('/reports/trial-balance?asOf=2027-03-31').expect(200);
      const rows = (res.body as { data: TrialBalanceBody }).data.rows;

      const cash = rows.find((r) => r.ledgerName === 'Cash');
      const sales = rows.find((r) => r.ledgerName === 'Sales — Bricks');

      expect(cash).toMatchObject({ closingDebit: '17500.00', closingCredit: '0.00' });
      expect(sales).toMatchObject({ closingDebit: '0.00', closingCredit: '17500.00' });
    });

    it('hides untouched ledgers unless asked for them', async () => {
      const lean = await get('/reports/trial-balance').expect(200);
      const full = await get('/reports/trial-balance?includeZero=true').expect(200);

      const leanRows = (lean.body as { data: TrialBalanceBody }).data.rows.length;
      const fullRows = (full.body as { data: TrialBalanceBody }).data.rows.length;

      expect(leanRows).toBe(2); // only Cash and Sales have moved
      expect(fullRows).toBeGreaterThan(leanRows);
    });

    it('excludes entries dated after the as-of date', async () => {
      const res = await get('/reports/trial-balance?asOf=2026-05-31').expect(200);
      const rows = (res.body as { data: TrialBalanceBody }).data.rows;

      // Only the two May vouchers count by then.
      expect(rows.find((r) => r.ledgerName === 'Cash')?.closingDebit).toBe('15000.00');
    });

    it('reports the difference when opening balances do not tie', async () => {
      // ACC-04 lets openings be entered before they balance; the trial balance
      // has to show that honestly rather than appear to tie.
      const fy = await dataSource.getRepository(FinancialYear).findOneByOrFail({ companyId });
      await post('/opening-balances')
        .send({
          financialYearId: fy.id,
          balances: [{ ledgerId: capitalLedgerId, openingDebit: '0.00', openingCredit: '750.00' }],
        })
        .expect(201);

      const res = await get('/reports/trial-balance?asOf=2027-03-31').expect(200);
      const body = (res.body as { data: TrialBalanceBody }).data;

      expect(body.isBalanced).toBe(false);
      expect(body.difference).toBe('-750.00');

      // Put it back so the suite leaves a tidy state.
      await post('/opening-balances')
        .send({
          financialYearId: fy.id,
          balances: [{ ledgerId: capitalLedgerId, openingDebit: '0.00', openingCredit: '0.00' }],
        })
        .expect(201);
    });

    it('still balances after a reversal, because both entries stay in', async () => {
      const created = await post('/vouchers').send(journal('2026-07-01', '3333.33')).expect(201);
      const voucherId = (created.body as { data: { voucher: { id: string } } }).data.voucher.id;

      await post(`/vouchers/${voucherId}/reverse`).send({ voucherDate: '2026-07-02' }).expect(201);

      const res = await get('/reports/trial-balance?asOf=2027-03-31').expect(200);
      const body = (res.body as { data: TrialBalanceBody }).data;

      expect(body.isBalanced).toBe(true);
      // The pair nets to zero, so Cash is back where it was.
      expect(body.rows.find((r) => r.ledgerName === 'Cash')?.closingDebit).toBe('17500.00');
    });
  });

  it('needs the accounts.view permission', async () => {
    await request(app.getHttpServer()).get('/api/v1/reports/trial-balance').expect(401);
  });
});
