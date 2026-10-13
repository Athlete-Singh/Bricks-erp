import request from 'supertest';
import { DataSource } from 'typeorm';
import { seedChartForCompany } from '../src/accounting/chart-of-accounts.seed';
import { FinancialYear } from '../src/modules/company/entities/financial-year.entity';
import { Site } from '../src/modules/company/entities/site.entity';
import { Warehouse } from '../src/modules/inventory/entities/warehouse.entity';
import { BrickType } from '../src/modules/inventory/entities/brick-type.entity';
import { Item } from '../src/modules/inventory/entities/item.entity';
import { Unit } from '../src/modules/inventory/entities/unit.entity';
import { Party } from '../src/modules/parties/entities/party.entity';
import { PartyService } from '../src/modules/parties/party.service';
import { StockService } from '../src/stock/stock.service';
import { createTenantFixture, type TenantFixture } from './helpers/tenant-fixture';

jest.setTimeout(90000);

/**
 * P11.1 — DSH-01 Owner summary, DSH-02 monthly series, CST-01 cost per 1,000.
 *
 * Posts enough real data for the aggregates to say something — a sorted batch,
 * a sale, an expense, a confirmed dispatch — then reads the dashboard and
 * checks the KMQs line up with what was posted. Also proves cross-tenant
 * refusal and the honest "unknown" answer when a window has no fired bricks.
 */
describe('Dashboard & costing (e2e)', () => {
  let fx: TenantFixture;
  let ds: DataSource;
  let siteA: Site;
  let yardA: Warehouse;
  let rawYardA: Warehouse;
  let bricksItem: Item;
  let coalItem: Item;
  let classOne: BrickType;
  let customer: Party;
  let sardar: Party;

  const SYSTEM_USER = '00000000-0000-4000-8000-0000000000aa';
  const FIRING_DATE = '2026-10-04';
  const SORT_DATE = '2026-10-05';

  const post = (path: string, token: string, body: Record<string, unknown>) =>
    request(fx.app.getHttpServer()).post(`/api/v1/${path}`).set('Authorization', `Bearer ${token}`).send(body);

  const patch = (path: string, token: string, body: Record<string, unknown> = {}) =>
    request(fx.app.getHttpServer()).patch(`/api/v1/${path}`).set('Authorization', `Bearer ${token}`).send(body);

  const get = (path: string, token: string, query: Record<string, string> = {}) =>
    request(fx.app.getHttpServer()).get(`/api/v1/${path}`).query(query).set('Authorization', `Bearer ${token}`);

  const ledgerId = async (code: string): Promise<string> => {
    const rows = await ds.query<{ id: string }[]>(
      `SELECT id FROM ledgers WHERE company_id = $1 AND code = $2 LIMIT 1`,
      [fx.companyA.id, code],
    );
    return rows[0]!.id;
  };

  beforeAll(async () => {
    fx = await createTenantFixture({
      prefix: 'Dashboard Test',
      domain: 'dashboard.test',
      tables: [
        'dispatch_lines',
        'dispatches',
        'customer_receipt_allocations',
        'customer_receipts',
        'sales_charges',
        'sales_invoice_lines',
        'sales_invoices',
        'expenses',
        'production_consumptions',
        'production_sorting_outputs',
        'production_entries',
        'production_batches',
        'stock_movements',
        'voucher_lines',
        'vouchers',
        'voucher_sequences',
        'idempotency_keys',
        'items',
        'brick_types',
        'warehouses',
        'units',
        'parties',
        'ledgers',
        'voucher_types',
        'ledger_groups',
        'financial_years',
        'sites',
      ],
      mobilePrefix: '910000020',
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
    rawYardA = await ds
      .getRepository(Warehouse)
      .save(ds.getRepository(Warehouse).create({ companyId: fx.companyA.id, siteId: siteA.id, name: 'Raw Yard' }));

    const unitKg = await ds
      .getRepository(Unit)
      .save(ds.getRepository(Unit).create({ companyId: fx.companyA.id, name: 'Kilogram', abbreviation: 'kg' }));
    const unitK = await ds
      .getRepository(Unit)
      .save(ds.getRepository(Unit).create({ companyId: fx.companyA.id, name: 'Thousand', abbreviation: 'K' }));
    coalItem = await ds
      .getRepository(Item)
      .save(
        ds
          .getRepository(Item)
          .create({ companyId: fx.companyA.id, name: 'Coal', category: 'raw_material', unitId: unitKg.id }),
      );
    bricksItem = await ds
      .getRepository(Item)
      .save(
        ds
          .getRepository(Item)
          .create({ companyId: fx.companyA.id, name: 'Class 1 Brick', category: 'other', unitId: unitK.id }),
      );

    classOne = await ds
      .getRepository(BrickType)
      .save(ds.getRepository(BrickType).create({ companyId: fx.companyA.id, grade: 'Class 1' }));

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
    sardar = await partyService.create(fx.companyA.id, SYSTEM_USER, {
      name: 'Ramesh Sardar',
      partyTypes: ['sardar'],
      gstin: null,
      pan: null,
      stateCode: null,
      address: null,
      phone: null,
      email: null,
      openingDebit: '0.00',
      openingCredit: '0.00',
    });

    // Opening stock so firing has coal to consume and the yard has stock on hand.
    const stock = fx.app.get(StockService);
    await ds.transaction(async (manager) => {
      await stock.record(manager, {
        companyId: fx.companyA.id,
        userId: SYSTEM_USER,
        warehouseId: rawYardA.id,
        itemId: coalItem.id,
        movementType: 'opening',
        direction: 'in',
        quantity: '10000.000',
        movementDate: '2026-09-01',
        sourceType: 'opening_balance',
        sourceId: null,
        notes: 'Opening coal',
      });
      // Also prime a brick stock on hand so dispatch has something to carry.
      await stock.record(manager, {
        companyId: fx.companyA.id,
        userId: SYSTEM_USER,
        warehouseId: yardA.id,
        itemId: bricksItem.id,
        movementType: 'opening',
        direction: 'in',
        quantity: '50000.000',
        movementDate: '2026-09-01',
        sourceType: 'opening_balance',
        sourceId: null,
        notes: 'Opening bricks',
      });
    });
  });

  afterAll(async () => {
    await fx.close();
  });

  // ──────────────────────────────────────────────────────────────────────────

  it('seeds a production batch, an invoice, an expense and a dispatch for October', async () => {
    // Full batch: making → drying → firing → sorting into stock.
    const batch = await post('production/batches', fx.tokenA, {
      siteId: siteA.id,
      chamber: 'C1',
      batchDate: '2026-10-01',
    }).expect(201);
    const batchId = batch.body.data.id as string;

    await post(`production/batches/${batchId}/making`, fx.tokenA, {
      entryDate: '2026-10-01',
      greenBricks: '10000',
    }).expect(201);
    await post(`production/batches/${batchId}/firing`, fx.tokenA, {
      entryDate: FIRING_DATE,
      firedBricks: '9800',
    }).expect(201);
    await post(`production/batches/${batchId}/sorting`, fx.tokenA, {
      entryDate: SORT_DATE,
      warehouseId: yardA.id,
      outputs: [{ brickTypeId: classOne.id, quantity: '9500' }],
      brokenBricks: '200',
      rejectBricks: '100',
    }).expect(201);

    // Electricity expense — a direct cost that feeds cost per 1,000.
    const electricity = await ledgerId('ELECTRICITY');
    const cash = await ledgerId('CASH');
    await post('expenses', fx.tokenA, {
      siteId: siteA.id,
      categoryLedgerId: electricity,
      expenseDate: '2026-10-10',
      amount: '20500',
      mode: 'cash',
      paidFromLedgerId: cash,
    }).expect(201);

    // Coal consumed on the firing — booked as a direct expense ledger entry
    // so coalCostMtd has something to show.
    const coalLedger = await ledgerId('COAL');
    await post('vouchers', fx.tokenA, {
      voucherType: 'journal',
      voucherDate: '2026-10-04',
      siteId: siteA.id,
      lines: [
        { ledgerId: coalLedger, debit: '15000', credit: '0' },
        { ledgerId: cash, debit: '0', credit: '15000' },
      ],
    }).expect(201);

    // Wages accrued to the Sardar — Dr LABOUR_WAGES / Cr the sardar's own
    // ledger. This is what LAB-04 does under the hood (ADR-035); using a
    // plain journal here means the test does not depend on all of P6.
    const labourLedger = await ledgerId('LABOUR_WAGES');
    const sardarLedger = await ds.query<{ id: string }[]>(
      `SELECT id FROM ledgers WHERE company_id = $1 AND party_id = $2 LIMIT 1`,
      [fx.companyA.id, sardar.id],
    );
    await post('vouchers', fx.tokenA, {
      voucherType: 'journal',
      voucherDate: '2026-10-05',
      siteId: siteA.id,
      lines: [
        { ledgerId: labourLedger, debit: '5000', credit: '0' },
        { ledgerId: sardarLedger[0]!.id, debit: '0', credit: '5000' },
      ],
    }).expect(201);

    // Sales invoice — 4000 × ₹8 taxable, 12 % GST = ₹35,840 total.
    await post('sales/invoices', fx.tokenA, {
      customerPartyId: customer.id,
      siteId: siteA.id,
      invoiceDate: '2026-10-10',
      lines: [
        {
          itemId: bricksItem.id,
          warehouseId: yardA.id,
          quantity: '4000',
          rate: '8',
          cgstRate: '6',
          sgstRate: '6',
        },
      ],
    }).expect(201);

    // Dispatch confirmed in the gate — moves stock when confirmed with no
    // invoice yet (ADR-041 challan-first path).
    const dispatch = await post('dispatches', fx.tokenA, {
      siteId: siteA.id,
      customerPartyId: customer.id,
      dispatchDate: '2026-10-12',
      lines: [{ itemId: bricksItem.id, warehouseId: yardA.id, quantity: '3000' }],
    }).expect(201);
    await patch(`dispatches/${dispatch.body.data.id}/confirm`, fx.tokenA).expect(200);
  });

  // ──────────────────────────────────────────────────────────────────────────

  describe('DSH-01 summary', () => {
    it('answers the Key Management Questions for the kiln', async () => {
      const res = await get('dashboard/summary', fx.tokenA, { asOf: '2026-10-31' }).expect(200);
      const meta = res.body.meta as {
        production: { firedToday: string; firedMtd: string; firedYtd: string; sortedMtd: string };
        stock: { bricksProduced: string; itemsOnHand: string; itemCount: number };
        sold: { mtd: string };
        dispatched: { mtd: string };
        receivables: string;
        payables: string;
        labourPayable: string;
        expenses: { mtd: string };
        coalCostMtd: string;
        dieselCostMtd: string;
        costPerThousandMtd: string | null;
        costPerThousandBenchmark: string;
        grossMarginPercentMtd: string | null;
      };

      expect(meta.production.firedMtd).toBe('9800.000');
      expect(meta.production.sortedMtd).toBe('9500.000');
      // Brick-type stock = 9,500 sorted into Finished Yard this month; the
      // test fixture's "bricks" item is tracked on the item side, kept apart
      // because kg of coal and pieces of brick cannot be added together.
      expect(meta.stock.bricksProduced).toBe('9500.000');
      expect(meta.sold.mtd).toBe('35840.00');
      expect(meta.dispatched.mtd).toBe('3000.000');
      expect(meta.receivables).toBe('35840.00');
      expect(meta.labourPayable).toBe('5000.00');
      expect(meta.expenses.mtd).toBe('20500.00');
      expect(meta.coalCostMtd).toBe('15000.00');
      expect(meta.costPerThousandBenchmark).toBe('4100.00');
      // Direct expenses MTD = electricity 20,500 + coal 15,000 + wages 5,000
      // = 40,500. Divided by 9.800k fired bricks → ₹4,132.65 per 1,000.
      expect(meta.costPerThousandMtd).not.toBeNull();
      expect(Number(meta.costPerThousandMtd)).toBeGreaterThan(4100);
      expect(Number(meta.costPerThousandMtd)).toBeLessThan(4200);
    });

    it('reports zero everything to a tenant with no data', async () => {
      const res = await get('dashboard/summary', fx.tokenB, { asOf: '2026-10-31' }).expect(200);
      const meta = res.body.meta as {
        production: { firedMtd: string };
        stock: { bricksProduced: string };
        sold: { mtd: string };
        dispatched: { mtd: string };
        receivables: string;
        costPerThousandMtd: string | null;
      };
      expect(meta.production.firedMtd).toBe('0.000');
      expect(meta.sold.mtd).toBe('0.00');
      expect(meta.dispatched.mtd).toBe('0.000');
      expect(meta.receivables).toBe('0.00');
      // No fired bricks → cost per 1,000 is unknown, not ∞.
      expect(meta.costPerThousandMtd).toBeNull();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────

  describe('DSH-02 monthly series', () => {
    it('returns a point for every month in the window with sales and production on October', async () => {
      const res = await get('dashboard/monthly', fx.tokenA, {
        fromMonth: '2026-08',
        toMonth: '2026-10',
      }).expect(200);
      const items = res.body.data as {
        month: string;
        productionFired: string;
        salesInvoiced: string;
        dispatched: string;
      }[];
      expect(items.map((i) => i.month)).toEqual(['2026-08', '2026-09', '2026-10']);
      const oct = items.find((i) => i.month === '2026-10')!;
      expect(oct.productionFired).toBe('9800.000');
      expect(oct.salesInvoiced).toBe('35840.00');
      expect(oct.dispatched).toBe('3000.000');
      const aug = items.find((i) => i.month === '2026-08')!;
      expect(aug.productionFired).toBe('0.000');
      expect(aug.salesInvoiced).toBe('0.00');
    });

    it('refuses a window that ends before it starts', async () => {
      const res = await get('dashboard/monthly', fx.tokenA, {
        fromMonth: '2026-10',
        toMonth: '2026-08',
      }).expect(422);
      expect(res.body.error.code).toBe('DATE_RANGE_INVALID');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────

  describe('CST-01 cost per 1,000', () => {
    it('allocates direct expenses to the fired bricks of the kiln-month', async () => {
      const res = await get('reports/cost-per-1000', fx.tokenA, {
        fromDate: '2026-10-01',
        toDate: '2026-10-31',
      }).expect(200);
      const items = res.body.data as {
        siteId: string;
        month: string;
        brickTypeId: string;
        firedBricks: string;
        buckets: Record<string, string>;
        totalCost: string;
        costPerThousand: string | null;
        deltaVsBenchmark: string | null;
        overBenchmark: boolean | null;
        benchmark: string;
      }[];
      expect(items).toHaveLength(1);
      const row = items[0]!;
      expect(row.month).toBe('2026-10');
      expect(row.firedBricks).toBe('9500.000'); // sorted output
      expect(row.benchmark).toBe('4100.00');

      // The site-month total is 9,500 (only one brick type), so this row carries
      // 100 % of the pro-rated costs: electricity 20,500 + coal 15,000 +
      // labour 5,000 = 40,500.
      expect(Number(row.buckets.electricity)).toBeCloseTo(20500, 2);
      expect(Number(row.buckets.coal)).toBeCloseTo(15000, 2);
      expect(Number(row.buckets.labour)).toBeCloseTo(5000, 2);
      expect(Number(row.totalCost)).toBeCloseTo(40500, 2);

      // 40,500 ÷ 9.500k = ₹4,263.16 per 1,000 → over the ₹4,100 benchmark.
      expect(row.costPerThousand).not.toBeNull();
      expect(Number(row.costPerThousand)).toBeGreaterThan(4200);
      expect(Number(row.costPerThousand)).toBeLessThan(4300);
      expect(row.overBenchmark).toBe(true);
      expect(Number(row.deltaVsBenchmark)).toBeGreaterThan(0);
    });

    it('refuses a window that ends before it starts', async () => {
      const res = await get('reports/cost-per-1000', fx.tokenA, {
        fromDate: '2026-10-31',
        toDate: '2026-10-01',
      }).expect(422);
      expect(res.body.error.code).toBe('DATE_RANGE_INVALID');
    });

    it('returns no rows for a month with no sorted output', async () => {
      const res = await get('reports/cost-per-1000', fx.tokenA, {
        fromDate: '2026-08-01',
        toDate: '2026-08-31',
      }).expect(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.meta.rowCount).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────

  describe('RPT-02 daily report', () => {
    it('rolls up October 10 across every module', async () => {
      // The seed step posted an invoice and an expense on 2026-10-10.
      const res = await get('reports/daily', fx.tokenA, { date: '2026-10-10' }).expect(200);
      const meta = res.body.meta as {
        production: { fired: string; sorted: string };
        dispatch: { bricks: string; challans: number };
        sales: { invoiced: string; invoices: number };
        collection: string;
        expenses: string;
        coalCost: string;
        dieselCost: string;
        labourPresent: number;
      };
      expect(meta.sales.invoices).toBe(1);
      expect(meta.sales.invoiced).toBe('35840.00');
      expect(meta.expenses).toBe('20500.00');
      expect(meta.dispatch.bricks).toBe('0.000'); // dispatch is on the 12th
      expect(meta.labourPresent).toBe(0);
    });

    it('shows nothing happened on a quiet day', async () => {
      const res = await get('reports/daily', fx.tokenA, { date: '2026-10-20' }).expect(200);
      const meta = res.body.meta as { sales: { invoiced: string }; expenses: string };
      expect(meta.sales.invoiced).toBe('0.00');
      expect(meta.expenses).toBe('0.00');
    });
  });

  describe('RPT-03 sales register', () => {
    it('lists one row per invoice line with GST split', async () => {
      const res = await get('reports/sales-register', fx.tokenA, {
        fromDate: '2026-10-01',
        toDate: '2026-10-31',
      }).expect(200);
      const items = res.body.data as {
        customerName: string;
        quantity: string;
        rate: string;
        taxableAmount: string;
        cgstAmount: string;
        sgstAmount: string;
        lineTotal: string;
      }[];
      expect(items).toHaveLength(1);
      expect(items[0]!.customerName).toBe('Shri Krishna Builders');
      expect(items[0]!.taxableAmount).toBe('32000.00');
      expect(items[0]!.cgstAmount).toBe('1920.00');
      expect(items[0]!.sgstAmount).toBe('1920.00');
      expect(items[0]!.lineTotal).toBe('35840.00');
      expect(res.body.meta.total).toBe('35840.00');
    });

    it('refuses a window that ends before it starts', async () => {
      const res = await get('reports/sales-register', fx.tokenA, {
        fromDate: '2026-10-31',
        toDate: '2026-10-01',
      }).expect(422);
      expect(res.body.error.code).toBe('DATE_RANGE_INVALID');
    });
  });

  describe('RPT-04 labour register', () => {
    it('returns an empty attendance register when nothing is posted', async () => {
      const res = await get('reports/labour-register', fx.tokenA, {
        kind: 'attendance',
        fromDate: '2026-10-01',
        toDate: '2026-10-31',
      }).expect(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.meta.kind).toBe('attendance');
    });

    it('switches to wages mode with the kind flag', async () => {
      const res = await get('reports/labour-register', fx.tokenA, {
        kind: 'wages',
        fromDate: '2026-10-01',
        toDate: '2026-10-31',
      }).expect(200);
      expect(res.body.meta.kind).toBe('wages');
      // Our seed posted a journal to the sardar's ledger, not a labour_wage_accrual
      // row — that endpoint is for LAB-04 accrual records, so this is 0.
      expect(res.body.meta.totalGrossWages).toBe('0.00');
    });

    it('refuses an unknown kind', async () => {
      await get('reports/labour-register', fx.tokenA, {
        kind: 'other',
        fromDate: '2026-10-01',
        toDate: '2026-10-31',
      }).expect(400);
    });
  });

  describe('tenancy', () => {
    it('rejects an unauthenticated request', async () => {
      await request(fx.app.getHttpServer()).get('/api/v1/dashboard/summary').expect(401);
    });

    it('does not leak company A data into company B monthly series', async () => {
      const res = await get('dashboard/monthly', fx.tokenB, {
        fromMonth: '2026-08',
        toMonth: '2026-10',
      }).expect(200);
      const items = res.body.data as {
        productionFired: string;
        salesInvoiced: string;
        dispatched: string;
      }[];
      for (const row of items) {
        expect(Number(row.productionFired)).toBe(0);
        expect(Number(row.salesInvoiced)).toBe(0);
        expect(Number(row.dispatched)).toBe(0);
      }
    });
  });
});
