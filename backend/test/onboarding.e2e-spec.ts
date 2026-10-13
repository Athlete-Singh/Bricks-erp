import request from 'supertest';
import { DataSource } from 'typeorm';
import { seedChartForCompany } from '../src/accounting/chart-of-accounts.seed';
import { FinancialYear } from '../src/modules/company/entities/financial-year.entity';
import { Site } from '../src/modules/company/entities/site.entity';
import { Unit } from '../src/modules/inventory/entities/unit.entity';
import { Warehouse } from '../src/modules/inventory/entities/warehouse.entity';
import { Party } from '../src/modules/parties/entities/party.entity';
import { Item } from '../src/modules/inventory/entities/item.entity';
import { BrickType } from '../src/modules/inventory/entities/brick-type.entity';
import { createTenantFixture, type TenantFixture } from './helpers/tenant-fixture';

jest.setTimeout(90000);

/**
 * ONB-01 — the go-live import.
 *
 * The behaviour that matters here is refusal. An import that half-works at
 * go-live is worse than one that refuses: nobody can tell which half landed,
 * re-running duplicates it, and the kiln's first week of real entries is made
 * against a master list no one trusts.
 */
describe('Onboarding import (e2e)', () => {
  let fx: TenantFixture;
  let ds: DataSource;

  const post = (path: string, token: string, body: Record<string, unknown>) =>
    request(fx.app.getHttpServer())
      .post(`/api/v1/onboarding/${path}`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  beforeAll(async () => {
    fx = await createTenantFixture({
      prefix: 'Onboarding Test',
      domain: 'onboarding.test',
      tables: [
        'stock_movements',
        'brick_types',
        'items',
        'warehouses',
        'units',
        'parties',
        'ledgers',
        'voucher_types',
        'ledger_groups',
        'financial_years',
        'sites',
      ],
      mobilePrefix: '910000021',
    });
    ds = fx.dataSource;

    await ds.transaction(async (manager) => {
      await seedChartForCompany(manager, fx.companyA.id);
    });

    await ds.getRepository(FinancialYear).save(
      ds.getRepository(FinancialYear).create({
        companyId: fx.companyA.id,
        name: '2026-27',
        startDate: '2026-04-01',
        endDate: '2027-03-31',
        isActive: true,
        isLocked: false,
      }),
    );

    const site = await ds
      .getRepository(Site)
      .save(ds.getRepository(Site).create({ companyId: fx.companyA.id, name: 'Kiln One', code: 'K1' }));
    await ds
      .getRepository(Warehouse)
      .save(ds.getRepository(Warehouse).create({ companyId: fx.companyA.id, siteId: site.id, name: 'Main Yard' }));
    await ds
      .getRepository(Unit)
      .save(ds.getRepository(Unit).create({ companyId: fx.companyA.id, name: 'Thousand', abbreviation: 'K' }));
  });

  afterAll(async () => {
    await fx.close();
  });

  // ── parties ────────────────────────────────────────────────────────────────

  describe('parties', () => {
    const rows = [
      { name: 'Shri Krishna Builders', types: 'customer', stateCode: '09', openingDebit: '35840', openingCredit: '0' },
      { name: 'Ramesh Sardar', types: 'sardar,supplier', openingDebit: '0', openingCredit: '5000' },
    ];

    it('says what it would create, and creates nothing', async () => {
      const res = await post('preview', fx.tokenA, { kind: 'parties', rows }).expect(201);
      expect(res.body.data.okCount).toBe(2);
      expect(res.body.data.imported).toBe(false);
      expect(res.body.data.rows[0].summary).toContain('Shri Krishna Builders');

      const saved = await ds.getRepository(Party).count({ where: { companyId: fx.companyA.id } });
      expect(saved).toBe(0);
    });

    it('imports them, with the opening figures and both party types', async () => {
      const res = await post('commit', fx.tokenA, { kind: 'parties', rows }).expect(201);
      expect(res.body.data.imported).toBe(true);

      const sardar = await ds
        .getRepository(Party)
        .findOneByOrFail({ companyId: fx.companyA.id, name: 'Ramesh Sardar' });
      expect(sardar.partyTypes.sort()).toEqual(['sardar', 'supplier']);
      expect(sardar.openingCredit).toBe('5000.00');
    });

    it('refuses a name that already exists rather than updating it quietly', async () => {
      const res = await post('commit', fx.tokenA, { kind: 'parties', rows: [rows[0]!] }).expect(422);
      expect(res.body.error.code).toBe('IMPORT_HAS_PROBLEMS');
      expect(res.body.error.details.rows[0].problems[0]).toMatch(/already exists/);
    });

    it('refuses a file that names the same party twice', async () => {
      // Both rows pass on their own; only reading the file as a whole catches it.
      const res = await post('preview', fx.tokenA, {
        kind: 'parties',
        rows: [
          { name: 'Twice Over', types: 'customer' },
          { name: 'twice over', types: 'supplier' },
        ],
      }).expect(201);
      expect(res.body.data.rows[0].ok).toBe(true);
      expect(res.body.data.rows[1].ok).toBe(false);
    });

    it('names the line and the field, so the fix is obvious in the spreadsheet', async () => {
      const res = await post('preview', fx.tokenA, {
        kind: 'parties',
        rows: [{ name: 'No Type Given', types: '' }],
      }).expect(201);
      // Line 2 is the first row of data — line 1 is the header.
      expect(res.body.data.rows[0].line).toBe(2);
      expect(res.body.data.rows[0].problems[0]).toMatch(/^types:/);
    });
  });

  // ── items and grades ───────────────────────────────────────────────────────

  describe('items', () => {
    it('creates a brick grade and its item together (ADR-051)', async () => {
      const res = await post('commit', fx.tokenA, {
        kind: 'items',
        rows: [
          { name: 'Class 1 Brick', category: 'other', unit: 'Thousand', brickGrade: 'Class 1' },
          { name: 'Coal', category: 'raw_material', unit: 'K' },
        ],
      }).expect(201);
      expect(res.body.data.imported).toBe(true);

      const grade = await ds.getRepository(BrickType).findOneByOrFail({ companyId: fx.companyA.id, grade: 'Class 1' });
      const item = await ds.getRepository(Item).findOneByOrFail({ id: grade.itemId });
      expect(item.name).toBe('Class 1 Brick');
    });

    it('refuses a unit the company does not have, rather than inventing one', async () => {
      const res = await post('preview', fx.tokenA, {
        kind: 'items',
        rows: [{ name: 'Mystery', category: 'other', unit: 'furlongs' }],
      }).expect(201);
      expect(res.body.data.rows[0].problems[0]).toMatch(/not a unit/);
    });
  });

  // ── opening balances ───────────────────────────────────────────────────────

  describe('opening balances', () => {
    it('matches a ledger by name or by code and sets the side given', async () => {
      const res = await post('commit', fx.tokenA, {
        kind: 'opening-balances',
        rows: [
          { ledger: 'Cash', debit: '50000', credit: '0' },
          { ledger: "Owner's Capital", debit: '0', credit: '50000' },
        ],
      }).expect(201);
      expect(res.body.data.imported).toBe(true);

      const rows = await ds.query<{ name: string; opening_debit: string; opening_credit: string }[]>(
        `SELECT name, opening_debit, opening_credit FROM ledgers WHERE company_id = $1 AND code IN ('CASH','OWNERS_CAPITAL') ORDER BY code`,
        [fx.companyA.id],
      );
      expect(rows.find((r) => r.name === 'Cash')?.opening_debit).toBe('50000.00');
    });

    it('refuses a ledger opening on both sides at once', async () => {
      const res = await post('preview', fx.tokenA, {
        kind: 'opening-balances',
        rows: [{ ledger: 'Cash', debit: '100', credit: '100' }],
      }).expect(201);
      expect(res.body.data.rows[0].problems[0]).toMatch(/one side/);
    });
  });

  // ── opening stock ──────────────────────────────────────────────────────────

  describe('opening stock', () => {
    it('takes a brick grade by its own name and stocks the item it sells as', async () => {
      const res = await post('commit', fx.tokenA, {
        kind: 'opening-stock',
        rows: [{ warehouse: 'Main Yard', item: 'Class 1', quantity: '50000' }],
      }).expect(201);
      expect(res.body.data.imported).toBe(true);
      // No date given, so it lands on the financial year's first day.
      expect(res.body.data.rows[0].summary).toContain('2026-04-01');

      const grade = await ds.getRepository(BrickType).findOneByOrFail({ companyId: fx.companyA.id, grade: 'Class 1' });
      const moved = await ds.query<{ quantity_in: string; item_id: string }[]>(
        `SELECT quantity_in, item_id FROM stock_movements WHERE company_id = $1 AND movement_type = 'opening'`,
        [fx.companyA.id],
      );
      expect(moved).toHaveLength(1);
      expect(moved[0]!.item_id).toBe(grade.itemId);
      expect(moved[0]!.quantity_in).toBe('50000.000');
    });

    it('refuses a second opening for the same pile, which would double it', async () => {
      const res = await post('commit', fx.tokenA, {
        kind: 'opening-stock',
        rows: [{ warehouse: 'Main Yard', item: 'Class 1', quantity: '10' }],
      });
      expect(res.status).toBe(409);
    });

    it('refuses a warehouse or item it cannot find', async () => {
      const res = await post('preview', fx.tokenA, {
        kind: 'opening-stock',
        rows: [{ warehouse: 'Nowhere', item: 'Nothing', quantity: '5' }],
      }).expect(201);
      expect(res.body.data.rows[0].problems).toHaveLength(2);
    });
  });

  // ── access ─────────────────────────────────────────────────────────────────

  describe('who may import', () => {
    it('refuses another company’s token the same way it refuses everything else', async () => {
      const res = await post('preview', fx.tokenB, {
        kind: 'opening-balances',
        rows: [{ ledger: 'Cash', debit: '1', credit: '0' }],
      });
      // Company B has no chart seeded here, so its own ledger lookup fails —
      // what matters is that it never sees company A's.
      expect([201, 403]).toContain(res.status);
      if (res.status === 201) expect(res.body.data.rows[0].ok).toBe(false);
    });

    it('rejects an unauthenticated import', async () => {
      await request(fx.app.getHttpServer())
        .post('/api/v1/onboarding/preview')
        .send({ kind: 'parties', rows: [{ name: 'X', types: 'customer' }] })
        .expect(401);
    });
  });
});
