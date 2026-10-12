import request from 'supertest';
import { seedChartForCompany } from '../src/accounting/chart-of-accounts.seed';
import { FinancialYear } from '../src/modules/company/entities/financial-year.entity';
import { Site } from '../src/modules/company/entities/site.entity';
import { Party } from '../src/modules/parties/entities/party.entity';
import { PartyService } from '../src/modules/parties/party.service';
import { Ledger } from '../src/accounting/entities/ledger.entity';
import { createPartySchema } from '@brics/shared';
import { createTenantFixture, type TenantFixture } from './helpers/tenant-fixture';

jest.setTimeout(60000);

describe('Labour Engine (e2e)', () => {
  let fx: TenantFixture;
  let siteA: Site;
  let sardarA: Party;
  let cashLedgerA: Ledger;

  beforeAll(async () => {
    fx = await createTenantFixture({
      prefix: 'Labour',
      domain: 'labour.test',
      tables: [
        // Must precede vouchers and parties: an accrual references both with
        // RESTRICT, so leaving it behind blocks the whole reset.
        'labour_wage_accruals',
        'labour_wage_rates',
        'labour_settlements',
        'labour_deductions',
        'labour_advances',
        'labour_attendance',
        'workers',
        'labour_groups',
        'voucher_lines',
        'vouchers',
        'idempotency_keys',
        'parties',
        'ledgers',
        'voucher_sequences',
        'voucher_types',
        'ledger_groups',
        'sites',
      ],
      mobilePrefix: '920000011',
    });

    const ds = fx.dataSource;

    await ds.transaction((manager) => seedChartForCompany(manager, fx.companyA.id));
    const fyRepo = ds.getRepository(FinancialYear);
    await fyRepo.save(
      fyRepo.create({
        companyId: fx.companyA.id,
        name: '2026-27',
        startDate: '2026-04-01',
        endDate: '2027-03-31',
        isActive: true,
      }),
    );

    const siteRepo = ds.getRepository(Site);
    siteA = await siteRepo.save(
      siteRepo.create({
        companyId: fx.companyA.id,
        name: 'Kiln Alpha',
        code: 'K-ALP',
        isActive: true,
      }),
    );

    const partyService = fx.app.get(PartyService);
    sardarA = await partyService.create(
      fx.companyA.id,
      '00000000-0000-0000-0000-000000000000',
      createPartySchema.parse({
        name: 'Ramesh Sardar',
        partyTypes: ['sardar'],
        phone: '9876543210',
      }),
    );

    cashLedgerA = await ds.getRepository(Ledger).findOneOrFail({
      where: { companyId: fx.companyA.id, code: 'CASH' },
    });
  });

  afterAll(async () => {
    await fx.close();
  });

  describe('LAB-01: Groups & Workers', () => {
    let groupId: string;
    let workerId: string;

    it('creates a labour group under a Sardar', async () => {
      const res = await request(fx.app.getHttpServer())
        .post('/api/v1/labour/groups')
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .send({
          sardarPartyId: sardarA.id,
          siteId: siteA.id,
          name: 'Ramesh Moulding Gang',
          activity: 'making',
        })
        .expect(201);

      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBe('Ramesh Moulding Gang');
      groupId = res.body.data.id;
    });

    it('lists labour groups with filters', async () => {
      const res = await request(fx.app.getHttpServer())
        .get(`/api/v1/labour/groups?sardarPartyId=${sardarA.id}`)
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(groupId);
    });

    it('updates a labour group', async () => {
      const res = await request(fx.app.getHttpServer())
        .patch(`/api/v1/labour/groups/${groupId}`)
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .send({ name: 'Ramesh Moulding Squad' })
        .expect(200);

      expect(res.body.data.name).toBe('Ramesh Moulding Squad');
    });

    it('creates a worker inside the group', async () => {
      const res = await request(fx.app.getHttpServer())
        .post('/api/v1/labour/workers')
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .send({
          labourGroupId: groupId,
          name: 'Suresh Kumar',
          dailyWageRate: '500.00',
        })
        .expect(201);

      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBe('Suresh Kumar');
      workerId = res.body.data.id;
    });

    it('lists workers in group', async () => {
      const res = await request(fx.app.getHttpServer())
        .get(`/api/v1/labour/workers?labourGroupId=${groupId}`)
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(workerId);
    });

    it('refuses cross-tenant group creation', async () => {
      await request(fx.app.getHttpServer())
        .post('/api/v1/labour/groups')
        .set('Authorization', `Bearer ${fx.tokenB}`)
        .send({
          sardarPartyId: sardarA.id,
          name: 'Sneaky Gang',
          activity: 'making',
        })
        .expect(404);
    });
  });

  describe('LAB-02: Attendance & Idempotency', () => {
    let groupId: string;
    let workerId: string;

    beforeAll(async () => {
      const gRes = await request(fx.app.getHttpServer())
        .post('/api/v1/labour/groups')
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .send({
          sardarPartyId: sardarA.id,
          name: 'Loading Gang A',
          activity: 'loading',
        });
      groupId = gRes.body.data.id;

      const wRes = await request(fx.app.getHttpServer())
        .post('/api/v1/labour/workers')
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .send({
          labourGroupId: groupId,
          name: 'Mukesh Loader',
          dailyWageRate: '600.00',
        });
      workerId = wRes.body.data.id;
    });

    it('rejects attendance dated in the future (ADR-028/033)', async () => {
      const res = await request(fx.app.getHttpServer())
        .post('/api/v1/labour/attendance')
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .send({
          siteId: siteA.id,
          labourGroupId: groupId,
          date: '2099-01-01',
          entries: [{ workerId, status: 'present' }],
        })
        .expect(422);

      expect(res.body.error.code).toBe('LABOUR_DATE_IN_FUTURE');
    });

    it('records group attendance and honours Idempotency-Key (SYN-01)', async () => {
      const idemKey = 'attendance-idem-001';
      const body = {
        siteId: siteA.id,
        labourGroupId: groupId,
        date: '2026-10-10',
        entries: [{ workerId, status: 'present', remarks: 'Full day shift' }],
      };

      // First submission
      const res1 = await request(fx.app.getHttpServer())
        .post('/api/v1/labour/attendance')
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .set('Idempotency-Key', idemKey)
        .send(body)
        .expect(201);

      expect(res1.body.data).toHaveLength(1);
      const firstEntryId = res1.body.data[0].id;

      // Replay with identical key + body -> returns stored response without duplicate insert
      const res2 = await request(fx.app.getHttpServer())
        .post('/api/v1/labour/attendance')
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .set('Idempotency-Key', idemKey)
        .send(body)
        .expect(201);

      expect(res2.body.data).toHaveLength(1);
      expect(res2.body.data[0].id).toBe(firstEntryId);

      // Replay with same key + mismatched body -> 422 IDEMPOTENCY_KEY_REUSED
      await request(fx.app.getHttpServer())
        .post('/api/v1/labour/attendance')
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .set('Idempotency-Key', idemKey)
        .send({ ...body, date: '2026-10-09' })
        .expect(422);
    });

    it('lists attendance records with query filters', async () => {
      const res = await request(fx.app.getHttpServer())
        .get(`/api/v1/labour/attendance?labourGroupId=${groupId}&date=2026-10-10`)
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].workerId).toBe(workerId);
      expect(res.body.data[0].status).toBe('present');
    });
  });

  describe('LAB-05 & LEK-03: Advances, Exposure & Idempotency', () => {
    it('rejects advance dated in the future', async () => {
      const res = await request(fx.app.getHttpServer())
        .post('/api/v1/labour/advances')
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .send({
          siteId: siteA.id,
          sardarPartyId: sardarA.id,
          date: '2099-01-01',
          amount: '1000.00',
          paymentMode: 'cash',
          cashBankLedgerId: cashLedgerA.id,
        })
        .expect(422);

      expect(res.body.error.code).toBe('LABOUR_DATE_IN_FUTURE');
    });

    it('creates a cash advance, posts payment journal, returns LEK-03 exposure with warning, and supports Idempotency-Key', async () => {
      const idemKey = 'advance-idem-001';
      const body = {
        siteId: siteA.id,
        sardarPartyId: sardarA.id,
        date: '2026-10-10',
        amount: '2000.00',
        paymentMode: 'cash',
        cashBankLedgerId: cashLedgerA.id,
        remarks: 'Pre-season advance',
      };

      const res1 = await request(fx.app.getHttpServer())
        .post('/api/v1/labour/advances')
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .set('Idempotency-Key', idemKey)
        .send(body)
        .expect(201);

      expect(res1.body.data.advance.id).toBeDefined();
      expect(res1.body.data.advance.voucherId).toBeDefined();
      expect(res1.body.data.exposure).toBeDefined();
      expect(res1.body.data.exposure.isExposed).toBe(true);
      expect(res1.body.data.warning).toContain('Warning: Sardar Ramesh Sardar has unsecured advance exposure');

      const advanceId = res1.body.data.advance.id;

      // Replay with identical key + body -> returns stored response without duplicate voucher
      const res2 = await request(fx.app.getHttpServer())
        .post('/api/v1/labour/advances')
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .set('Idempotency-Key', idemKey)
        .send(body)
        .expect(201);

      expect(res2.body.data.advance.id).toBe(advanceId);
    });

    it('lists advances with query filters', async () => {
      const res = await request(fx.app.getHttpServer())
        .get(`/api/v1/labour/advances?sardarPartyId=${sardarA.id}`)
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].amount).toBe('2000.00');
    });

    it('queries live Sardar advance exposure via /advances/exposure and /exposure', async () => {
      const res1 = await request(fx.app.getHttpServer())
        .get(`/api/v1/labour/advances/exposure?sardarPartyId=${sardarA.id}`)
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);

      expect(res1.body.data.sardarPartyId).toBe(sardarA.id);
      expect(res1.body.data.advancesDrawn).toBe('2000.00');
      expect(res1.body.data.isExposed).toBe(true);

      const res2 = await request(fx.app.getHttpServer())
        .get(`/api/v1/labour/exposure?sardarPartyId=${sardarA.id}`)
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);

      expect(res2.body.data.netExposure).toBe(res1.body.data.netExposure);
    });

    it('queries overview exposure summary across all Sardars (/exposure-summary)', async () => {
      const res = await request(fx.app.getHttpServer())
        .get('/api/v1/labour/exposure-summary?onlyExposed=true')
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].sardarPartyId).toBe(sardarA.id);
      expect(res.body.data[0].isExposed).toBe(true);
    });
  });

  describe('LAB-06: Deductions', () => {
    it('creates a deduction (khurak) and reduces net exposure in LEK-03', async () => {
      const res = await request(fx.app.getHttpServer())
        .post('/api/v1/labour/deductions')
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .send({
          siteId: siteA.id,
          sardarPartyId: sardarA.id,
          date: '2026-10-10',
          category: 'khurak',
          amount: '500.00',
          remarks: 'Weekly ration distribution',
        })
        .expect(201);

      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.category).toBe('khurak');
      expect(res.body.data.amount).toBe('500.00');

      // Verify exposure reflects deduction
      const expRes = await request(fx.app.getHttpServer())
        .get(`/api/v1/labour/exposure?sardarPartyId=${sardarA.id}`)
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);

      expect(expRes.body.data.deductionsTotal).toBe('500.00');
    });

    it('lists deductions with query filters', async () => {
      const res = await request(fx.app.getHttpServer())
        .get(`/api/v1/labour/deductions?sardarPartyId=${sardarA.id}&category=khurak`)
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].amount).toBe('500.00');
    });
  });

  describe('LAB-04: Auto Wage Accrual', () => {
    beforeAll(async () => {
      // A making rate has to exist. Accrual used to fall back to an invented
      // ₹650 per 1,000 when none was configured, which priced a season's piece
      // work at a number nobody had agreed to; it now refuses instead.
      await request(fx.app.getHttpServer())
        .post('/api/v1/labour/wage-rates')
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .send({ activity: 'making', unit: '1000 bricks', rateAmount: '650' })
        .expect(201);
    });

    it('accrues wages from attendance and posts balanced journal voucher (Dr Wages Cr Sardar)', async () => {
      const res = await request(fx.app.getHttpServer())
        .post('/api/v1/labour/accrue-wages')
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .send({
          siteId: siteA.id,
          sardarPartyId: sardarA.id,
          date: '2026-10-10',
          periodFrom: '2026-10-01',
          periodTo: '2026-10-10',
          remarks: 'Period 1 wage accrual',
        })
        .expect(201);

      expect(res.body.data.voucherId).toBeDefined();
      expect(res.body.data.voucherNumber).toBeDefined();
      expect(Number(res.body.data.grossWages)).toBeGreaterThan(0);

      // Verify voucher lines in database: Dr LABOUR_WAGES, Cr Sardar Party Ledger
      const lines = await fx.dataSource.query(
        `SELECT l.code, vl.debit, vl.credit
         FROM voucher_lines vl
         JOIN ledgers l ON l.id = vl.ledger_id
         WHERE vl.voucher_id = $1
         ORDER BY vl.debit DESC`,
        [res.body.data.voucherId],
      );

      expect(lines).toHaveLength(2);
      expect(lines[0].code).toBe('LABOUR_WAGES');
      expect(lines[0].debit).toBe(res.body.data.grossWages);
      expect(lines[1].credit).toBe(res.body.data.grossWages);
    });
  });

  describe('paying for the same work twice', () => {
    let groupId: string;
    let workerId: string;

    beforeAll(async () => {
      const gRes = await request(fx.app.getHttpServer())
        .post('/api/v1/labour/groups')
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .send({ sardarPartyId: sardarA.id, name: 'Duplicate Check Gang', activity: 'making' });
      groupId = gRes.body.data.id as string;

      const wRes = await request(fx.app.getHttpServer())
        .post('/api/v1/labour/workers')
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .send({ labourGroupId: groupId, name: 'Repeat Worker', dailyWageRate: '400.00' });
      workerId = wRes.body.data.id as string;
    });

    it('refuses a second accrual whose period overlaps one already paid', async () => {
      // An Idempotency-Key only catches an identical retry. A genuine second
      // request, or one whose range merely overlaps, used to post the whole
      // amount again and the Sardar was owed it twice.
      const res = await request(fx.app.getHttpServer())
        .post('/api/v1/labour/accrue-wages')
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .send({
          siteId: siteA.id,
          sardarPartyId: sardarA.id,
          date: '2026-10-05',
          periodFrom: '2026-10-01',
          periodTo: '2026-10-03',
          remarks: 'Overlaps the period already accrued',
        })
        .expect(422);
      expect(res.body.error.code).toBe('WAGES_ALREADY_ACCRUED');
    });

    it('refuses the same worker marked present twice on one day', async () => {
      // Without this the worker is paid their daily wage twice for one day.
      const payload = {
        siteId: siteA.id,
        labourGroupId: groupId,
        date: '2026-09-20',
        entries: [{ workerId, status: 'present' }],
      };
      await request(fx.app.getHttpServer())
        .post('/api/v1/labour/attendance')
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .send(payload)
        .expect(201);

      const second = await request(fx.app.getHttpServer())
        .post('/api/v1/labour/attendance')
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .send(payload);
      expect(second.status).toBe(409);
      // Named, so the refusal is the duplicate guard and not some other clash.
      expect(second.body.error.message).toBe('That worker is already marked for this day');
    });
  });

  describe('LAB-07: Seasonal Settlement', () => {
    it('creates seasonal settlement statement and posts payment journal when payable', async () => {
      const res = await request(fx.app.getHttpServer())
        .post('/api/v1/labour/settlements')
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .send({
          siteId: siteA.id,
          sardarPartyId: sardarA.id,
          periodFrom: '2026-10-01',
          periodTo: '2026-10-10',
          advancesRecovered: '100.00',
          deductions: '100.00',
          paymentMode: 'cash',
          cashBankLedgerId: cashLedgerA.id,
          remarks: 'Mid-season settlement test',
        })
        .expect(201);

      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe('paid');
      expect(res.body.data.voucherId).toBeDefined();
      const settlementId = res.body.data.id;

      // Get single settlement by id
      const getRes = await request(fx.app.getHttpServer())
        .get(`/api/v1/labour/settlements/${settlementId}`)
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);

      expect(getRes.body.data.id).toBe(settlementId);
      expect(getRes.body.data.sardarParty.name).toBe('Ramesh Sardar');

      // List settlements
      const listRes = await request(fx.app.getHttpServer())
        .get(`/api/v1/labour/settlements?sardarPartyId=${sardarA.id}`)
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);

      expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});
