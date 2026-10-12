import request from 'supertest';
import { DataSource } from 'typeorm';
import { Site } from '../src/modules/company/entities/site.entity';
import { Warehouse } from '../src/modules/inventory/entities/warehouse.entity';
import { Unit } from '../src/modules/inventory/entities/unit.entity';
import { Item } from '../src/modules/inventory/entities/item.entity';
import { Party } from '../src/modules/parties/entities/party.entity';
import { FinancialYear } from '../src/modules/company/entities/financial-year.entity';
import { seedChartForCompany } from '../src/accounting/chart-of-accounts.seed';
import { PartyService } from '../src/modules/parties/party.service';
import { StockService } from '../src/stock/stock.service';
import { createTenantFixture, type TenantFixture } from './helpers/tenant-fixture';

jest.setTimeout(60000);

/** P10.1b — ACC-08, ACC-09, ACC-10 and the OQ #4 closing stock valuation. */
describe('Financial statements (e2e)', () => {
  let fx: TenantFixture;
  let ds: DataSource;
  let siteA: Site;
  let yardA: Warehouse;
  let bricks: Item;
  let seconds: Item;
  let customer: Party;
  let cashLedgerId: string;
  let electricityLedgerId: string;

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

  beforeAll(async () => {
    fx = await createTenantFixture({
      prefix: 'Financials Test',
      domain: 'financials.test',
      tables: [
        'closing_stock_rates',
        'expenses',
        'sales_charges',
        'sales_invoice_lines',
        'sales_invoices',
        'stock_movements',
        'voucher_lines',
        'vouchers',
        'voucher_sequences',
        'idempotency_keys',
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
      mobilePrefix: '910000014',
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
    yardA = await ds
      .getRepository(Warehouse)
      .save(ds.getRepository(Warehouse).create({ companyId: fx.companyA.id, siteId: siteA.id, name: 'Finished Yard' }));

    const unit = await ds
      .getRepository(Unit)
      .save(ds.getRepository(Unit).create({ companyId: fx.companyA.id, name: 'Thousand', abbreviation: 'K' }));
    const mkItem = (name: string) =>
      ds
        .getRepository(Item)
        .save(ds.getRepository(Item).create({ companyId: fx.companyA.id, name, category: 'other', unitId: unit.id }));
    bricks = await mkItem('Class 1 Brick');
    seconds = await mkItem('Class 2 Brick');

    const partyService = fx.app.get(PartyService);
    customer = await partyService.create(fx.companyA.id, SYSTEM_USER, {
      name: 'Shri Krishna Builders',
      partyTypes: ['customer'],
      gstin: null,
      pan: null,
      stateCode: '09',
      address: null,
      phone: null,
      email: null,
      openingDebit: '0.00',
      openingCredit: '0.00',
    });

    cashLedgerId = await ledgerId('CASH');
    electricityLedgerId = await ledgerId('ELECTRICITY');

    // Stock in the yard, an expense out of the drawer, and a sale on credit —
    // enough for a P&L and a Balance Sheet to have something to say.
    const stock = fx.app.get(StockService);
    await ds.transaction(async (manager) => {
      for (const item of [bricks, seconds]) {
        await stock.record(manager, {
          companyId: fx.companyA.id,
          userId: SYSTEM_USER,
          warehouseId: yardA.id,
          itemId: item.id,
          movementType: 'opening',
          direction: 'in',
          quantity: '10000.000',
          movementDate: '2026-08-01',
          sourceType: 'opening_balance',
          sourceId: null,
          notes: 'Opening stock',
        });
      }
    });

    await post('expenses', fx.tokenA, {
      siteId: siteA.id,
      categoryLedgerId: electricityLedgerId,
      expenseDate: '2026-09-05',
      amount: '20000',
      mode: 'cash',
      paidFromLedgerId: cashLedgerId,
    }).expect(201);

    await post('sales/invoices', fx.tokenA, {
      customerPartyId: customer.id,
      siteId: siteA.id,
      invoiceDate: '2026-09-10',
      lines: [
        {
          itemId: bricks.id,
          warehouseId: yardA.id,
          quantity: '4000',
          rate: '8',
          cgstRate: '6',
          sgstRate: '6',
          igstRate: '0',
        },
      ],
    }).expect(201);
  });

  afterAll(async () => {
    await fx.close();
  });

  // ──────────────────────────────────────────────────────────────────────────

  describe('closing stock valuation (OQ #4)', () => {
    it('reports stock as unvalued until the owner prices it', async () => {
      const res = await get('reports/closing-stock', fx.tokenA, { asOf: '2026-09-30' }).expect(200);
      const items = res.body.data as { itemName: string; quantity: string; rate: string | null; unvalued: boolean }[];

      // 10,000 in, 4,000 sold.
      expect(items.find((i) => i.itemName === 'Class 1 Brick')?.quantity).toBe('6000.000');
      expect(items.every((i) => i.unvalued)).toBe(true);
      expect(res.body.meta.totalValue).toBe('0.00');
      expect(res.body.meta.unvaluedCount).toBe(2);
    });

    it('values the yard from the rate per grade, with quantity from the stock ledger', async () => {
      await post('reports/closing-stock/rates', fx.tokenA, {
        asOf: '2026-09-30',
        rates: [
          { itemId: bricks.id, rate: '5' },
          { itemId: seconds.id, rate: '3' },
        ],
      }).expect(201);

      const res = await get('reports/closing-stock', fx.tokenA, { asOf: '2026-09-30' }).expect(200);
      const items = res.body.data as { itemName: string; value: string | null }[];

      expect(items.find((i) => i.itemName === 'Class 1 Brick')?.value).toBe('30000.00'); // 6,000 × 5
      expect(items.find((i) => i.itemName === 'Class 2 Brick')?.value).toBe('30000.00'); // 10,000 × 3
      expect(res.body.meta.totalValue).toBe('60000.00');
      expect(res.body.meta.unvaluedCount).toBe(0);
    });

    it('re-entering a rate replaces it rather than adding a second one', async () => {
      await post('reports/closing-stock/rates', fx.tokenA, {
        asOf: '2026-09-30',
        rates: [{ itemId: bricks.id, rate: '6' }],
      }).expect(201);

      const res = await get('reports/closing-stock', fx.tokenA, { asOf: '2026-09-30' }).expect(200);
      const brick = (res.body.data as { itemName: string; value: string | null }[]).find(
        (i) => i.itemName === 'Class 1 Brick',
      );
      expect(brick?.value).toBe('36000.00'); // 6,000 × 6
    });

    it('refuses the same grade twice in one valuation', async () => {
      const res = await post('reports/closing-stock/rates', fx.tokenA, {
        asOf: '2026-09-30',
        rates: [
          { itemId: bricks.id, rate: '5' },
          { itemId: bricks.id, rate: '7' },
        ],
      }).expect(422);
      expect(res.body.error.code).toBe('DUPLICATE_ITEM_RATE');
    });

    it('refuses to value a future date', async () => {
      const res = await post('reports/closing-stock/rates', fx.tokenA, {
        asOf: '2099-01-01',
        rates: [{ itemId: bricks.id, rate: '5' }],
      }).expect(422);
      expect(res.body.error.code).toBe('VALUATION_DATE_IN_FUTURE');
    });
  });

  describe('ACC-08 Profit & Loss', () => {
    it('carries sales and closing stock to gross profit, then to net', async () => {
      const res = await get('reports/profit-and-loss', fx.tokenA, {
        fromDate: '2026-09-01',
        toDate: '2026-09-30',
      }).expect(200);
      const meta = res.body.meta as {
        directIncome: { ledgerCode: string | null; amount: string }[];
        directExpenses: { ledgerCode: string | null; amount: string }[];
        closingStock: { value: string; unvaluedCount: number } | null;
        totals: Record<string, string>;
      };

      // 4,000 × ₹8 = ₹32,000 of bricks. GST is a liability, not income.
      expect(meta.directIncome.find((l) => l.ledgerCode === 'SALES_BRICKS')?.amount).toBe('32000.00');
      // Electricity is a direct expense in the seeded chart — it feeds
      // cost-per-1,000, so it sits above the gross-profit line.
      expect(meta.directExpenses.find((l) => l.ledgerCode === 'ELECTRICITY')?.amount).toBe('20000.00');
      expect(meta.closingStock?.value).toBe('66000.00'); // 36,000 + 30,000

      // Gross = sales + closing stock − electricity (a direct cost).
      expect(meta.totals.grossProfit).toBe('78000.00');
      // Nothing indirect was booked, so net equals gross.
      expect(meta.totals.netProfit).toBe('78000.00');
    });

    it('says how many grades it could not price', async () => {
      // A statement that silently treats unpriced stock as worthless is worse
      // than one that says it could not price it.
      const res = await get('reports/profit-and-loss', fx.tokenA, {
        fromDate: '2026-10-01',
        toDate: '2026-10-31',
      }).expect(200);
      expect(res.body.meta.unvaluedStockGrades).toBeGreaterThan(0);
    });

    it('refuses a window that ends before it starts', async () => {
      const res = await get('reports/profit-and-loss', fx.tokenA, {
        fromDate: '2026-09-30',
        toDate: '2026-09-01',
      }).expect(422);
      expect(res.body.error.code).toBe('DATE_RANGE_INVALID');
    });
  });

  describe('ACC-08 Balance Sheet', () => {
    it('shows the customer as a debtor and the stock as an asset', async () => {
      const res = await get('reports/balance-sheet', fx.tokenA, { asOf: '2026-09-30' }).expect(200);
      const meta = res.body.meta as {
        assets: { groupCode: string; total: string }[];
        liabilities: { groupCode: string; total: string }[];
        closingStock: { value: string };
        retainedEarnings: string;
        totals: { assets: string; liabilities: string; difference: string };
      };

      // ₹32,000 + 12 % GST = ₹35,840 owed by the customer.
      expect(meta.assets.find((g) => g.groupCode === 'SUNDRY_DEBTORS')?.total).toBe('35840.00');
      // Cash went down by the ₹20,000 power bill.
      expect(meta.assets.find((g) => g.groupCode === 'CASH_IN_HAND')?.total).toBe('-20000.00');
      expect(meta.liabilities.find((g) => g.groupCode === 'DUTIES_TAXES')?.total).toBe('3840.00');
      expect(meta.closingStock.value).toBe('66000.00');
      expect(meta.retainedEarnings).toBe('12000.00'); // 32,000 sales − 20,000 expense
    });

    it('reports the difference rather than forcing the statement to agree', async () => {
      const res = await get('reports/balance-sheet', fx.tokenA, { asOf: '2026-09-30' }).expect(200);
      const totals = res.body.meta.totals as { assets: string; liabilities: string; difference: string };
      expect(Number(totals.assets) - Number(totals.liabilities)).toBeCloseTo(Number(totals.difference), 2);
    });
  });

  describe('ACC-09 receivables and payables', () => {
    it('shows who owes the kiln', async () => {
      const res = await get('reports/party-balances', fx.tokenA, { asOf: '2026-09-30' }).expect(200);
      const items = res.body.data as { name: string; receivable: string; payable: string }[];

      const builder = items.find((i) => i.name === 'Shri Krishna Builders');
      expect(builder?.receivable).toBe('35840.00');
      expect(builder?.payable).toBe('0.00');
      expect(res.body.meta.receivable).toBe('35840.00');
    });

    it('hides parties who are square unless asked', async () => {
      const hidden = await get('reports/party-balances', fx.tokenA, { asOf: '2026-08-01' }).expect(200);
      expect(hidden.body.data).toHaveLength(0);

      const shown = await get('reports/party-balances', fx.tokenA, {
        asOf: '2026-08-01',
        includeSettled: 'true',
      }).expect(200);
      expect((shown.body.data as unknown[]).length).toBeGreaterThan(0);
    });
  });

  describe('ACC-10 year-end close', () => {
    it('refuses to close a year that has not ended', async () => {
      const years = await ds.query<{ id: string }[]>(
        `SELECT id FROM financial_years WHERE company_id = $1 LIMIT 1`,
        [fx.companyA.id],
      );
      const res = await post('financial-years/close', fx.tokenA, {
        financialYearId: years[0]!.id,
        nextFinancialYearId: years[0]!.id,
        confirm: true,
      }).expect(422);
      expect(res.body.error.code).toBe('FINANCIAL_YEAR_NOT_OVER');
    });

    it('carries balance-sheet balances into the next year and locks the old one', async () => {
      const repo = ds.getRepository(FinancialYear);
      const closing = await repo.save(
        repo.create({
          companyId: fx.companyA.id,
          name: '2025-26',
          startDate: '2025-04-01',
          endDate: '2026-03-31',
          isActive: false,
          isLocked: false,
        }),
      );
      const next = await repo.save(
        repo.create({
          companyId: fx.companyA.id,
          name: '2026-27b',
          startDate: '2026-04-01',
          endDate: '2027-03-31',
          isActive: false,
          isLocked: false,
        }),
      );

      const res = await post('financial-years/close', fx.tokenA, {
        financialYearId: closing.id,
        nextFinancialYearId: next.id,
        confirm: true,
      }).expect(201);

      expect(res.body.data.financialYear.isLocked).toBe(true);
      expect(res.body.data.financialYear.closedAt).not.toBeNull();

      // Nothing was posted before 2026-03-31, so nothing is carried — and the
      // close still has to succeed and lock the year.
      expect(res.body.data.carriedLedgers).toBe(0);

      const again = await post('financial-years/close', fx.tokenA, {
        financialYearId: closing.id,
        nextFinancialYearId: next.id,
        confirm: true,
      }).expect(422);
      // Closing twice would double every opening balance.
      expect(again.body.error.code).toBe('FINANCIAL_YEAR_ALREADY_CLOSED');
    });

    it('refuses two years that are not consecutive', async () => {
      const repo = ds.getRepository(FinancialYear);
      const closing = await repo.save(
        repo.create({
          companyId: fx.companyA.id,
          name: '2024-25',
          startDate: '2024-04-01',
          endDate: '2025-03-31',
          isActive: false,
          isLocked: false,
        }),
      );
      const notNext = await repo.save(
        repo.create({
          companyId: fx.companyA.id,
          name: '2027-28',
          startDate: '2027-04-01',
          endDate: '2028-03-31',
          isActive: false,
          isLocked: false,
        }),
      );

      const res = await post('financial-years/close', fx.tokenA, {
        financialYearId: closing.id,
        nextFinancialYearId: notNext.id,
        confirm: true,
      }).expect(422);
      expect(res.body.error.code).toBe('FINANCIAL_YEARS_NOT_CONSECUTIVE');
    });

    it('refuses a close that was not confirmed', async () => {
      const years = await ds.query<{ id: string }[]>(
        `SELECT id FROM financial_years WHERE company_id = $1 LIMIT 1`,
        [fx.companyA.id],
      );
      await post('financial-years/close', fx.tokenA, {
        financialYearId: years[0]!.id,
        nextFinancialYearId: years[0]!.id,
      }).expect(400);
    });
  });

  describe('tenancy', () => {
    it('never shows another company a Balance Sheet with these numbers', async () => {
      const res = await get('reports/balance-sheet', fx.tokenB, { asOf: '2026-09-30' }).expect(200);
      expect(res.body.meta.totals.assets).toBe('0.00');
      expect(res.body.meta.retainedEarnings).toBe('0.00');
    });

    it('refuses an unauthenticated caller', async () => {
      await request(fx.app.getHttpServer()).get('/api/v1/reports/profit-and-loss').expect(401);
    });
  });
});
