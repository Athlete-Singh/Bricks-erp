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

/**
 * The posting engine against a real PostgreSQL.
 *
 * The unit tests cover the rules; this covers what only a database can prove —
 * that the CHECK constraints hold, that voucher numbers stay gapless under
 * concurrency, and that a rolled-back transaction does not burn a number.
 */
describe('Posting engine (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let token: string;
  let companyId: string;
  let cashId: string;
  let salesId: string;

  const PASSWORD = 'posting-owner-pw';

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
      .save(dataSource.getRepository(Company).create({ name: 'Posting Test Bricks', stateCode: '09' }));
    companyId = company.id;
    await dataSource.transaction((manager) => seedChartForCompany(manager, companyId));

    await dataSource.getRepository(FinancialYear).save(
      dataSource.getRepository(FinancialYear).create({
        companyId,
        name: '2026-27',
        startDate: '2026-04-01',
        endDate: '2027-03-31',
        isActive: true,
        isLocked: false,
      }),
    );

    const user = await dataSource.getRepository(User).save(
      dataSource.getRepository(User).create({
        email: 'owner@posting.test',
        mobile: '9500000001',
        name: 'Posting Owner',
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
      .send({ emailOrMobile: 'owner@posting.test', password: PASSWORD })
      .expect(200);
    token = login.body.data.accessToken;

    const ledgerRepo = dataSource.getRepository(Ledger);
    cashId = (await ledgerRepo.findOneByOrFail({ companyId, code: 'CASH' })).id;
    salesId = (await ledgerRepo.findOneByOrFail({ companyId, code: 'SALES_BRICKS' })).id;
  });

  afterAll(async () => {
    await resetFixtures();
    await app.close();
  });

  async function resetFixtures(): Promise<void> {
    await dataSource.query(`
      DELETE FROM "voucher_lines" WHERE "company_id" IN (SELECT id FROM "companies" WHERE "name" LIKE 'Posting Test%');
      DELETE FROM "voucher_sequences" WHERE "company_id" IN (SELECT id FROM "companies" WHERE "name" LIKE 'Posting Test%');
      DELETE FROM "vouchers" WHERE "company_id" IN (SELECT id FROM "companies" WHERE "name" LIKE 'Posting Test%');
      DELETE FROM "ledgers" WHERE "company_id" IN (SELECT id FROM "companies" WHERE "name" LIKE 'Posting Test%');
      DELETE FROM "ledger_groups" WHERE "company_id" IN (SELECT id FROM "companies" WHERE "name" LIKE 'Posting Test%');
      DELETE FROM "voucher_types" WHERE "company_id" IN (SELECT id FROM "companies" WHERE "name" LIKE 'Posting Test%');
      DELETE FROM "user_companies" WHERE "user_id" IN (SELECT id FROM "users" WHERE "email" LIKE '%@posting.test');
      DELETE FROM "refresh_tokens" WHERE "user_id" IN (SELECT id FROM "users" WHERE "email" LIKE '%@posting.test');
      DELETE FROM "audit_logs" WHERE "company_id" IN (SELECT id FROM "companies" WHERE "name" LIKE 'Posting Test%');
      DELETE FROM "users" WHERE "email" LIKE '%@posting.test';
      DELETE FROM "financial_years" WHERE "company_id" IN (SELECT id FROM "companies" WHERE "name" LIKE 'Posting Test%');
      DELETE FROM "companies" WHERE "name" LIKE 'Posting Test%';
    `);
  }

  const post = (path: string) =>
    request(app.getHttpServer()).post(`/api/v1${path}`).set('Authorization', `Bearer ${token}`);
  const get = (path: string) =>
    request(app.getHttpServer()).get(`/api/v1${path}`).set('Authorization', `Bearer ${token}`);

  /** supertest types `body` as `any`; narrow it once here instead of per call. */
  const voucherNumber = (res: { body: unknown }): string =>
    (res.body as { data: { voucher: { number: string } } }).data.voucher.number;
  const sequenceOf = (res: { body: unknown }): number => Number(voucherNumber(res).split('/')[2]);

  const journal = (debit: string, credit: string, date = '2026-06-15') => ({
    voucherType: 'journal',
    voucherDate: date,
    narration: 'Test entry',
    lines: [
      { ledgerId: cashId, debit },
      { ledgerId: salesId, credit },
    ],
  });

  describe('a journal must balance', () => {
    it('posts a balanced journal and returns its number', async () => {
      const res = await post('/vouchers').send(journal('1000.00', '1000.00')).expect(201);

      expect(res.body.data.voucher.number).toMatch(/^JNL\/2026-27\/\d{6}$/);
      expect(res.body.data.lines).toHaveLength(2);
    });

    it('refuses an unbalanced journal with a domain code, not a 500', async () => {
      const res = await post('/vouchers').send(journal('1000.00', '900.00')).expect(422);

      expect(res.body.error.code).toBe('JOURNAL_UNBALANCED');
      expect(res.body.error.message).toMatch(/differ by 100\.00/);
    });

    it('writes nothing when the journal is rejected', async () => {
      const before = await dataSource.getRepository('vouchers').count({ where: { companyId } });
      await post('/vouchers').send(journal('500.00', '400.00')).expect(422);
      const after = await dataSource.getRepository('vouchers').count({ where: { companyId } });

      expect(after).toBe(before);
    });
  });

  describe('the financial year gate', () => {
    it('refuses a date outside any financial year', async () => {
      const res = await post('/vouchers')
        .send(journal('100.00', '100.00', '2020-01-01'))
        .expect(422);
      expect(res.body.error.code).toBe('FY_NOT_FOUND');
    });

    it('refuses posting into a locked year, and allows it again once unlocked', async () => {
      const fyRepo = dataSource.getRepository(FinancialYear);
      await fyRepo.update({ companyId }, { isLocked: true });

      const locked = await post('/vouchers').send(journal('100.00', '100.00')).expect(422);
      expect(locked.body.error.code).toBe('FY_LOCKED');

      await fyRepo.update({ companyId }, { isLocked: false });
      await post('/vouchers').send(journal('100.00', '100.00')).expect(201);
    });
  });

  describe('voucher numbering is gapless', () => {
    it('numbers sequentially', async () => {
      const first = await post('/vouchers').send(journal('10.00', '10.00')).expect(201);
      const second = await post('/vouchers').send(journal('10.00', '10.00')).expect(201);

      expect(sequenceOf(second)).toBe(sequenceOf(first) + 1);
    });

    it('does not burn a number when a post is rejected', async () => {
      // A Postgres sequence would leak here; the counter row rolls back with
      // the transaction, which is why numbering uses a table.
      const before = await post('/vouchers').send(journal('10.00', '10.00')).expect(201);
      await post('/vouchers').send(journal('10.00', '99.00')).expect(422);
      const after = await post('/vouchers').send(journal('10.00', '10.00')).expect(201);

      expect(sequenceOf(after)).toBe(sequenceOf(before) + 1);
    });

    it('issues unique, unbroken numbers under concurrent posts', async () => {
      const concurrent = await Promise.all(
        Array.from({ length: 8 }, () => post('/vouchers').send(journal('5.00', '5.00'))),
      );

      const numbers = concurrent.map((r) => r.body.data?.voucher?.number as string);
      expect(concurrent.every((r) => r.status === 201)).toBe(true);
      expect(new Set(numbers).size).toBe(numbers.length);

      const sequences = numbers.map((n) => Number(n.split('/')[2])).sort((a, b) => a - b);
      // No gaps and no duplicates across the eight.
      expect(sequences[7]! - sequences[0]!).toBe(7);
    });
  });

  describe('reversal, not editing (ACC-02)', () => {
    it('has no update route — a posted voucher is immutable', async () => {
      const created = await post('/vouchers').send(journal('250.00', '250.00')).expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/vouchers/${created.body.data.voucher.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ narration: 'edited' })
        .expect(404);
    });

    it('writes the mirror and marks the original reversed', async () => {
      const created = await post('/vouchers').send(journal('750.00', '750.00')).expect(201);
      const voucherId = created.body.data.voucher.id;

      const reversal = await post(`/vouchers/${voucherId}/reverse`).send({}).expect(201);

      expect(reversal.body.data.voucher.reversalOfId).toBe(voucherId);
      const original = await get(`/vouchers/${voucherId}`).expect(200);
      expect(original.body.data.voucher.status).toBe('reversed');

      // Cash was debited 750 and is now credited 750 — net zero.
      const reversedLines = reversal.body.data.lines as Array<{ ledgerId: string; debit: string; credit: string }>;
      const cashLine = reversedLines.find((l) => l.ledgerId === cashId);
      expect(cashLine).toMatchObject({ debit: '0.00', credit: '750.00' });
    });

    it('refuses to reverse the same voucher twice', async () => {
      const created = await post('/vouchers').send(journal('80.00', '80.00')).expect(201);
      const voucherId = created.body.data.voucher.id;

      await post(`/vouchers/${voucherId}/reverse`).send({}).expect(201);
      const second = await post(`/vouchers/${voucherId}/reverse`).send({}).expect(422);

      expect(second.body.error.code).toBe('VOUCHER_ALREADY_REVERSED');
    });
  });

  describe('tenancy and validation', () => {
    it('refuses a ledger from another company', async () => {
      const other = await dataSource
        .getRepository(Company)
        .save(dataSource.getRepository(Company).create({ name: 'Posting Test Other', stateCode: '27' }));
      await dataSource.transaction((manager) => seedChartForCompany(manager, other.id));
      const foreignCash = await dataSource.getRepository(Ledger).findOneByOrFail({ companyId: other.id, code: 'CASH' });

      const res = await post('/vouchers')
        .send({
          voucherType: 'journal',
          voucherDate: '2026-06-15',
          lines: [
            { ledgerId: foreignCash.id, debit: '100.00' },
            { ledgerId: salesId, credit: '100.00' },
          ],
        })
        .expect(422);

      expect(res.body.error.code).toBe('LEDGER_NOT_IN_COMPANY');
    });

    it('refuses a line with both a debit and a credit, as a field error', async () => {
      const res = await post('/vouchers')
        .send({
          voucherType: 'journal',
          voucherDate: '2026-06-15',
          lines: [
            { ledgerId: cashId, debit: '100.00', credit: '100.00' },
            { ledgerId: salesId, credit: '100.00' },
          ],
        })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('needs a bearer token', async () => {
      await request(app.getHttpServer()).post('/api/v1/vouchers').send(journal('1.00', '1.00')).expect(401);
    });
  });

  describe('the Day Book feed', () => {
    it('returns vouchers newest first with paging meta', async () => {
      const res = await get('/vouchers?limit=5').expect(200);

      expect(res.body.meta).toEqual(expect.objectContaining({ page: 1, limit: 5 }));
      expect(res.body.data.length).toBeLessThanOrEqual(5);
      for (const voucher of res.body.data) expect(voucher.companyId).toBe(companyId);
    });

    it('filters by ledger', async () => {
      const res = await get(`/vouchers?ledgerId=${cashId}&limit=100`).expect(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });
});
