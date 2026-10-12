import request from 'supertest';
import { DataSource } from 'typeorm';
import { Site } from '../src/modules/company/entities/site.entity';
import { Party } from '../src/modules/parties/entities/party.entity';
import { FinancialYear } from '../src/modules/company/entities/financial-year.entity';
import { seedChartForCompany } from '../src/accounting/chart-of-accounts.seed';
import { PartyService } from '../src/modules/parties/party.service';
import { createTenantFixture, type TenantFixture } from './helpers/tenant-fixture';

jest.setTimeout(60000);

/** P10.1a — EXP-01, EXP-02, CSH-01 and ACC-07, against real Postgres. */
describe('Expenses and the cash book (e2e)', () => {
  let fx: TenantFixture;
  let ds: DataSource;
  let siteA: Site;
  let supplier: Party;
  let cashLedgerId: string;
  let bankLedgerId: string;
  let electricityLedgerId: string;
  let salesLedgerId: string;

  const SYSTEM_USER = '00000000-0000-4000-8000-0000000000aa';

  const post = (path: string, token: string, body: Record<string, unknown>) =>
    request(fx.app.getHttpServer())
      .post(`/api/v1/${path}`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const get = (path: string, token: string, query: Record<string, string> = {}) =>
    request(fx.app.getHttpServer())
      .get(`/api/v1/${path}`)
      .query(query)
      .set('Authorization', `Bearer ${token}`);

  const ledgerId = async (code: string): Promise<string> => {
    const rows = await ds.query<{ id: string }[]>(
      `SELECT id FROM ledgers WHERE company_id = $1 AND code = $2 LIMIT 1`,
      [fx.companyA.id, code],
    );
    return rows[0]!.id;
  };

  const balance = async (code: string): Promise<number> => {
    const rows = await ds.query<{ bal: string | null }[]>(
      `SELECT COALESCE(SUM(vl."debit") - SUM(vl."credit"), 0) AS bal
         FROM voucher_lines vl JOIN ledgers l ON l.id = vl.ledger_id
        WHERE l.company_id = $1 AND l.code = $2 AND vl.deleted_at IS NULL`,
      [fx.companyA.id, code],
    );
    return Number(rows[0]?.bal ?? 0);
  };

  beforeAll(async () => {
    fx = await createTenantFixture({
      prefix: 'Expense Test',
      domain: 'expenses.test',
      tables: [
        'expenses',
        'voucher_lines',
        'vouchers',
        'voucher_sequences',
        'idempotency_keys',
        'parties',
        'ledgers',
        'voucher_types',
        'ledger_groups',
        'financial_years',
        'sites',
      ],
      mobilePrefix: '910000013',
    });
    ds = fx.dataSource;

    await ds.transaction(async (manager) => {
      await seedChartForCompany(manager, fx.companyA.id);
      await seedChartForCompany(manager, fx.companyB.id);
    });

    for (const company of [fx.companyA, fx.companyB]) {
      await ds.getRepository(FinancialYear).save(
        ds.getRepository(FinancialYear).create({
          companyId: company.id,
          name: '2026-27',
          startDate: '2026-04-01',
          endDate: '2027-03-31',
          isActive: true,
          isLocked: false,
        }),
      );
    }

    siteA = await ds
      .getRepository(Site)
      .save(ds.getRepository(Site).create({ companyId: fx.companyA.id, name: 'Kiln One', code: 'K1' }));

    const partyService = fx.app.get(PartyService);
    supplier = await partyService.create(fx.companyA.id, SYSTEM_USER, {
      name: 'UP Power Corporation',
      partyTypes: ['supplier'],
      gstin: null,
      pan: null,
      stateCode: null,
      address: null,
      phone: null,
      email: null,
      openingDebit: '0.00',
      openingCredit: '0.00',
    });

    cashLedgerId = await ledgerId('CASH');
    electricityLedgerId = await ledgerId('ELECTRICITY');
    salesLedgerId = await ledgerId('SALES_BRICKS');

    // A bank account to pay from — the chart seeds the group, not an account.
    const bankGroup = await ds.query<{ id: string }[]>(
      `SELECT id FROM ledger_groups WHERE company_id = $1 AND code = 'BANK_ACCOUNTS' LIMIT 1`,
      [fx.companyA.id],
    );
    const bank = await ds.query<{ id: string }[]>(
      `INSERT INTO ledgers (company_id, group_id, name, code, is_system)
       VALUES ($1, $2, 'SBI Current A/c', 'BANK_SBI', false) RETURNING id`,
      [fx.companyA.id, bankGroup[0]!.id],
    );
    bankLedgerId = bank[0]!.id;
  });

  afterAll(async () => {
    await fx.close();
  });

  // ──────────────────────────────────────────────────────────────────────────

  describe('EXP-01 categories', () => {
    it('lists the expense ledgers, split into direct and indirect', async () => {
      const res = await get('expenses/categories', fx.tokenA).expect(200);
      const categories = res.body.data as { name: string; code: string | null; kind: string }[];

      expect(categories.find((c) => c.code === 'COAL')?.kind).toBe('direct');
      expect(categories.find((c) => c.code === 'SALARY')?.kind).toBe('indirect');
      // The two EXP-01 names the P2 chart never had, backfilled by the migration.
      expect(categories.find((c) => c.code === 'MACHINERY_REPAIRS')).toBeDefined();
      expect(categories.find((c) => c.code === 'FOOD_EXPENSES')).toBeDefined();
      // A sales ledger is not an expense category.
      expect(categories.find((c) => c.code === 'SALES_BRICKS')).toBeUndefined();
    });
  });

  describe('EXP-02 expense entry', () => {
    it('pays in cash: Dr the category, Cr Cash', async () => {
      const cat0 = await balance('ELECTRICITY');
      const cash0 = await balance('CASH');

      const res = await post('expenses', fx.tokenA, {
        siteId: siteA.id,
        categoryLedgerId: electricityLedgerId,
        expenseDate: '2026-09-01',
        amount: '12500',
        mode: 'cash',
        paidFromLedgerId: cashLedgerId,
        description: 'September power bill',
      }).expect(201);

      expect(res.body.data.expenseNo).toMatch(/^EXP-\d{5}$/);
      expect(res.body.data.voucherId).not.toBeNull();
      expect(await balance('ELECTRICITY')).toBe(cat0 + 12500);
      expect(await balance('CASH')).toBe(cash0 - 12500);
    });

    it('carries the cheque number onto the voucher (CSH-01)', async () => {
      const res = await post('expenses', fx.tokenA, {
        siteId: siteA.id,
        categoryLedgerId: electricityLedgerId,
        expenseDate: '2026-09-02',
        amount: '8000',
        mode: 'bank',
        paidFromLedgerId: bankLedgerId,
        instrumentType: 'cheque',
        instrumentRef: '004512',
      }).expect(201);

      const rows = await ds.query<{ instrument_type: string; instrument_ref: string }[]>(
        `SELECT instrument_type, instrument_ref FROM vouchers WHERE id = $1`,
        [res.body.data.voucherId],
      );
      expect(rows[0]).toEqual({ instrument_type: 'cheque', instrument_ref: '004512' });
    });

    it('on credit: the party is owed and the cash book does not move', async () => {
      const cash0 = await balance('CASH');

      const res = await post('expenses', fx.tokenA, {
        siteId: siteA.id,
        categoryLedgerId: electricityLedgerId,
        expenseDate: '2026-09-03',
        amount: '5000',
        mode: 'credit',
        partyId: supplier.id,
      }).expect(201);

      expect(res.body.data.paidFromLedgerId).toBeNull();
      expect(await balance('CASH')).toBe(cash0);

      const owed = await ds.query<{ bal: string }[]>(
        `SELECT COALESCE(SUM(vl."credit") - SUM(vl."debit"), 0) AS bal
           FROM voucher_lines vl WHERE vl.party_id = $1 AND vl.deleted_at IS NULL`,
        [supplier.id],
      );
      expect(Number(owed[0]!.bal)).toBe(5000);
    });

    it('refuses a category that is not an expense account', async () => {
      const res = await post('expenses', fx.tokenA, {
        siteId: siteA.id,
        categoryLedgerId: salesLedgerId,
        expenseDate: '2026-09-03',
        amount: '100',
        mode: 'cash',
        paidFromLedgerId: cashLedgerId,
      }).expect(422);
      expect(res.body.error.code).toBe('NOT_AN_EXPENSE_LEDGER');
    });

    it('refuses money leaving an account that is neither cash nor bank', async () => {
      const res = await post('expenses', fx.tokenA, {
        siteId: siteA.id,
        categoryLedgerId: electricityLedgerId,
        expenseDate: '2026-09-03',
        amount: '100',
        mode: 'cash',
        paidFromLedgerId: salesLedgerId,
      }).expect(422);
      expect(res.body.error.code).toBe('NOT_A_CASH_OR_BANK_LEDGER');
    });

    it('refuses a paid expense that also names a party', async () => {
      await post('expenses', fx.tokenA, {
        siteId: siteA.id,
        categoryLedgerId: electricityLedgerId,
        expenseDate: '2026-09-03',
        amount: '100',
        mode: 'cash',
        paidFromLedgerId: cashLedgerId,
        partyId: supplier.id,
      }).expect(400);
    });

    it('refuses a credit expense with nobody owed', async () => {
      await post('expenses', fx.tokenA, {
        siteId: siteA.id,
        categoryLedgerId: electricityLedgerId,
        expenseDate: '2026-09-03',
        amount: '100',
        mode: 'credit',
      }).expect(400);
    });

    it('refuses a future-dated expense (ADR-028)', async () => {
      const res = await post('expenses', fx.tokenA, {
        siteId: siteA.id,
        categoryLedgerId: electricityLedgerId,
        expenseDate: '2099-01-01',
        amount: '100',
        mode: 'cash',
        paidFromLedgerId: cashLedgerId,
      }).expect(422);
      expect(res.body.error.code).toBe('EXPENSE_DATE_IN_FUTURE');
    });

    it('refuses a ledger belonging to another company (ADR-021)', async () => {
      const res = await post('expenses', fx.tokenB, {
        siteId: siteA.id,
        categoryLedgerId: electricityLedgerId,
        expenseDate: '2026-09-03',
        amount: '100',
        mode: 'cash',
        paidFromLedgerId: cashLedgerId,
      }).expect(422);
      expect(res.body.error.code).toBe('SITE_NOT_FOUND');
    });

    it('needs accounts.manage, not merely accounts.view', async () => {
      // Money leaving the kiln is the accountant's signature, the same rule
      // paying a supplier bill carries (P7).
      await request(fx.app.getHttpServer())
        .post('/api/v1/expenses')
        .send({
          siteId: siteA.id,
          categoryLedgerId: electricityLedgerId,
          expenseDate: '2026-09-03',
          amount: '100',
          mode: 'cash',
          paidFromLedgerId: cashLedgerId,
        })
        .expect(401);
    });
  });

  describe('ACC-07 cash book', () => {
    it('opening plus in minus out really is closing', async () => {
      const res = await get('reports/cash-book', fx.tokenA, {
        fromDate: '2026-09-01',
        toDate: '2026-09-30',
      }).expect(200);

      const books = res.body.data as {
        ledgerName: string;
        opening: string;
        moneyIn: string;
        moneyOut: string;
        closing: string;
        entries: { number: string; moneyOut: string; balance: string; counterparty: string | null }[];
      }[];

      const cash = books.find((b) => b.ledgerName === 'Cash');
      expect(cash).toBeDefined();
      expect(Number(cash!.opening) + Number(cash!.moneyIn) - Number(cash!.moneyOut)).toBe(Number(cash!.closing));
      // The ₹12,500 power bill is the only cash movement in the window.
      expect(cash!.moneyOut).toBe('12500.00');
      expect(cash!.entries).toHaveLength(1);
      // The other side of the entry, so the row reads without a second lookup.
      expect(cash!.entries[0]!.counterparty).toBe('Electricity & Power');
    });

    it('a credit expense never reaches the cash book', async () => {
      const res = await get('reports/cash-book', fx.tokenA, {
        fromDate: '2026-09-03',
        toDate: '2026-09-03',
      }).expect(200);
      const cash = (res.body.data as { ledgerName: string; entries: unknown[] }[]).find(
        (b) => b.ledgerName === 'Cash',
      );
      expect(cash!.entries).toHaveLength(0);
    });

    it('bank book carries the cheque reference', async () => {
      const res = await get('reports/bank-book', fx.tokenA, {
        fromDate: '2026-09-01',
        toDate: '2026-09-30',
      }).expect(200);

      const bank = (res.body.data as { ledgerName: string; entries: { instrumentRef: string | null }[] }[]).find(
        (b) => b.ledgerName === 'SBI Current A/c',
      );
      expect(bank!.entries[0]!.instrumentRef).toBe('004512');
    });

    it('returns calendar dates, not timestamps', async () => {
      // A `date` column handed back as a JS Date serialises as UTC midnight and
      // reads a day early east of Greenwich — the P9.2 defect, kept out here.
      const res = await get('reports/cash-book', fx.tokenA, {
        fromDate: '2026-09-01',
        toDate: '2026-09-30',
      }).expect(200);
      const cash = (res.body.data as { ledgerName: string; entries: { date: string }[] }[]).find(
        (b) => b.ledgerName === 'Cash',
      );
      expect(cash!.entries[0]!.date).toBe('2026-09-01');
    });

    it('refuses a window that ends before it starts', async () => {
      const res = await get('reports/cash-book', fx.tokenA, {
        fromDate: '2026-09-30',
        toDate: '2026-09-01',
      }).expect(422);
      expect(res.body.error.code).toBe('DATE_RANGE_INVALID');
    });

    it('refuses a ledger that is not cash', async () => {
      const res = await get('reports/cash-book', fx.tokenA, {
        fromDate: '2026-09-01',
        toDate: '2026-09-30',
        ledgerId: bankLedgerId,
      }).expect(422);
      expect(res.body.error.code).toBe('NOT_A_CASH_LEDGER');
    });

    it('never shows another company the cash', async () => {
      const res = await get('reports/cash-book', fx.tokenB, {
        fromDate: '2026-09-01',
        toDate: '2026-09-30',
      }).expect(200);
      const books = res.body.data as { entries: unknown[] }[];
      expect(books.every((b) => b.entries.length === 0)).toBe(true);
    });
  });
});
