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

/** P10.1c — GST-04…07, against real Postgres. */
describe('GST registers and reconciliation (e2e)', () => {
  let fx: TenantFixture;
  let ds: DataSource;
  let siteA: Site;
  let yardA: Warehouse;
  let bricks: Item;
  let registered: Party;
  let unregistered: Party;

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

  const invoice = (customer: Party, invoiceDate: string, quantity: string, hsnCode: string | null) =>
    post('sales/invoices', fx.tokenA, {
      customerPartyId: customer.id,
      siteId: siteA.id,
      invoiceDate,
      lines: [
        {
          itemId: bricks.id,
          warehouseId: yardA.id,
          quantity,
          rate: '10',
          cgstRate: '6',
          sgstRate: '6',
          igstRate: '0',
          hsnCode,
        },
      ],
    });

  beforeAll(async () => {
    fx = await createTenantFixture({
      prefix: 'GST Test',
      domain: 'gst.test',
      tables: [
        'credit_note_lines',
        'credit_notes',
        'sales_charges',
        'sales_invoice_lines',
        'sales_invoices',
        'purchase_return_lines',
        'purchase_returns',
        'purchase_bill_lines',
        'purchase_bills',
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
      mobilePrefix: '910000015',
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
    bricks = await ds.getRepository(Item).save(
      ds
        .getRepository(Item)
        .create({ companyId: fx.companyA.id, name: 'Class 1 Brick', category: 'other', unitId: unit.id }),
    );

    const partyService = fx.app.get(PartyService);
    registered = await partyService.create(fx.companyA.id, SYSTEM_USER, {
      name: 'Shri Krishna Builders',
      partyTypes: ['customer'],
      gstin: '09AAACS1234A1Z5',
      pan: null,
      stateCode: '09',
      address: null,
      phone: null,
      email: null,
      openingDebit: '0.00',
      openingCredit: '0.00',
    });
    unregistered = await partyService.create(fx.companyA.id, SYSTEM_USER, {
      name: 'Local Mason',
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

    const stock = fx.app.get(StockService);
    await ds.transaction((manager) =>
      stock.record(manager, {
        companyId: fx.companyA.id,
        userId: SYSTEM_USER,
        warehouseId: yardA.id,
        itemId: bricks.id,
        movementType: 'opening',
        direction: 'in',
        quantity: '100000.000',
        movementDate: '2026-08-01',
        sourceType: 'opening_balance',
        sourceId: null,
        notes: 'Opening stock',
      }),
    );

    // One B2B invoice with an HSN, one B2C invoice without — the two shapes
    // GSTR-1 and the reconciliation have to tell apart.
    await invoice(registered, '2026-09-05', '5000', '6904').expect(201);
    await invoice(unregistered, '2026-09-08', '1000', null).expect(201);
  });

  afterAll(async () => {
    await fx.close();
  });

  // ──────────────────────────────────────────────────────────────────────────

  describe('GST-04 GSTR-1 register', () => {
    it('splits B2B from B2C on the customer GSTIN', async () => {
      const res = await get('gst/gstr-1', fx.tokenA, { month: '2026-09' }).expect(200);
      const meta = res.body.meta as {
        b2b: { invoiceNo: string; gstin: string | null; taxableAmount: string }[];
        b2c: { customerName: string; gstin: string | null }[];
        totals: Record<string, string | number>;
      };

      expect(meta.b2b).toHaveLength(1);
      expect(meta.b2b[0]!.gstin).toBe('09AAACS1234A1Z5');
      expect(meta.b2b[0]!.taxableAmount).toBe('50000.00');
      expect(meta.b2c).toHaveLength(1);
      expect(meta.b2c[0]!.customerName).toBe('Local Mason');
      expect(meta.totals.taxableAmount).toBe('60000.00');
      // 12 % on ₹60,000, split half CGST half SGST.
      expect(meta.totals.cgstAmount).toBe('3600.00');
      expect(meta.totals.sgstAmount).toBe('3600.00');
    });

    it('summarises by HSN and names the line that has none', async () => {
      const res = await get('gst/gstr-1', fx.tokenA, { month: '2026-09' }).expect(200);
      const hsn = res.body.meta.hsnSummary as { hsnCode: string; taxableAmount: string }[];

      expect(hsn.find((h) => h.hsnCode === '6904')?.taxableAmount).toBe('50000.00');
      // The portal refuses a row with no HSN, so it must be visible, not hidden.
      expect(hsn.find((h) => h.hsnCode === '(none)')?.taxableAmount).toBe('10000.00');
    });

    it('counts only the month asked for', async () => {
      const res = await get('gst/gstr-1', fx.tokenA, { month: '2026-10' }).expect(200);
      expect(res.body.meta.totals.taxableAmount).toBe('0.00');
      expect(res.body.meta.fromDate).toBe('2026-10-01');
      expect(res.body.meta.toDate).toBe('2026-10-31');
    });

    it('refuses a month that is not YYYY-MM', async () => {
      await get('gst/gstr-1', fx.tokenA, { month: '2026-13' }).expect(400);
    });

    it('exports CSV with both sections and the HSN summary', async () => {
      const res = await request(fx.app.getHttpServer())
        .get('/api/v1/gst/gstr-1/export')
        .query({ month: '2026-09' })
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('GSTR1-2026-09.csv');
      const csv = res.text;
      expect(csv).toContain('B2B,');
      expect(csv).toContain('B2C,');
      expect(csv).toContain('HSN summary');
      expect(csv).toContain('09AAACS1234A1Z5');
    });
  });

  describe('GST-05 GSTR-3B', () => {
    it('nets output tax against input credit', async () => {
      const res = await get('gst/gstr-3b', fx.tokenA, { month: '2026-09' }).expect(200);
      const meta = res.body.meta as {
        outwardSupplies: { taxableAmount: string; cgstAmount: string };
        totals: { outputTax: string; inputCredit: string; netPayable: string };
      };

      expect(meta.outwardSupplies.taxableAmount).toBe('60000.00');
      expect(meta.totals.outputTax).toBe('7200.00');
      // Nothing was bought, so everything is payable.
      expect(meta.totals.inputCredit).toBe('0.00');
      expect(meta.totals.netPayable).toBe('7200.00');
    });
  });

  describe('GST-06 sales and purchase registers', () => {
    it('lists every invoice with its tax', async () => {
      const res = await get('gst/sales-register', fx.tokenA, {
        fromDate: '2026-09-01',
        toDate: '2026-09-30',
      }).expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.taxableAmount).toBe('60000.00');
      // A calendar date, not a timestamp.
      expect((res.body.data as { documentDate: string }[])[0]!.documentDate).toBe('2026-09-05');
    });

    it('reports an empty purchase register honestly', async () => {
      const res = await get('gst/purchase-register', fx.tokenA, {
        fromDate: '2026-09-01',
        toDate: '2026-09-30',
      }).expect(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.meta.taxableAmount).toBe('0.00');
    });

    it('refuses a window that ends before it starts', async () => {
      const res = await get('gst/sales-register', fx.tokenA, {
        fromDate: '2026-09-30',
        toDate: '2026-09-01',
      }).expect(422);
      expect(res.body.error.code).toBe('DATE_RANGE_INVALID');
    });
  });

  describe('GST-07 reconciliation', () => {
    it('agrees with the books when every invoice posted its own tax', async () => {
      const res = await get('gst/reconciliation', fx.tokenA, { month: '2026-09' }).expect(200);
      const lines = res.body.data as { label: string; perRegister: string; perBooks: string; matches: boolean }[];

      expect(lines.find((l) => l.label === 'Output CGST')?.perRegister).toBe('3600.00');
      expect(lines.find((l) => l.label === 'Output CGST')?.perBooks).toBe('3600.00');
      expect(lines.every((l) => l.matches)).toBe(true);
      expect(res.body.meta.mismatchCount).toBe(0);
    });

    it('is not clean while an invoice is missing its HSN', async () => {
      // The register and the books agree, but the portal would still reject the
      // filing — "reconciled" has to mean filable, not merely balanced.
      const res = await get('gst/reconciliation', fx.tokenA, { month: '2026-09' }).expect(200);
      expect(res.body.meta.invoicesMissingHsn).toBe(1);
      expect(res.body.meta.missingHsnTaxable).toBe('10000.00');
      expect(res.body.meta.clean).toBe(false);
    });

    it('catches a hand-posted journal that the register cannot know about', async () => {
      const ledgers = await ds.query<{ id: string; code: string }[]>(
        `SELECT id, code FROM ledgers WHERE company_id = $1 AND code IN ('OUTPUT_CGST','CASH')`,
        [fx.companyA.id],
      );
      const outputCgst = ledgers.find((l) => l.code === 'OUTPUT_CGST')!.id;
      const cash = ledgers.find((l) => l.code === 'CASH')!.id;

      await post('vouchers', fx.tokenA, {
        voucherType: 'journal',
        voucherDate: '2026-09-20',
        narration: 'Hand-posted GST adjustment',
        lines: [
          { ledgerId: cash, debit: '500.00', credit: '0.00' },
          { ledgerId: outputCgst, debit: '0.00', credit: '500.00' },
        ],
      }).expect(201);

      const res = await get('gst/reconciliation', fx.tokenA, { month: '2026-09' }).expect(200);
      const cgst = (res.body.data as { label: string; difference: string; matches: boolean }[]).find(
        (l) => l.label === 'Output CGST',
      );
      // The books now hold ₹500 of CGST no invoice accounts for.
      expect(cgst?.difference).toBe('-500.00');
      expect(cgst?.matches).toBe(false);
      expect(res.body.meta.mismatchCount).toBe(1);
    });
  });

  describe('tenancy and permissions', () => {
    it('never shows another company a register', async () => {
      const res = await get('gst/gstr-1', fx.tokenB, { month: '2026-09' }).expect(200);
      expect(res.body.meta.totals.taxableAmount).toBe('0.00');
    });

    it('refuses an unauthenticated caller', async () => {
      await request(fx.app.getHttpServer()).get('/api/v1/gst/gstr-1?month=2026-09').expect(401);
    });
  });
});
