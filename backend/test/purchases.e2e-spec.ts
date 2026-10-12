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
import { createTenantFixture, type TenantFixture } from './helpers/tenant-fixture';

jest.setTimeout(60000);

/** P7 — PUR-01…06 and GST-03, against real Postgres. */
describe('Purchases (e2e)', () => {
  let fx: TenantFixture;
  let ds: DataSource;
  let siteA: Site;
  let yardA: Warehouse;
  let coal: Item;
  let diesel: Item;
  let supplier: Party;
  let customerOnly: Party;
  let cashLedgerId: string;

  const SYSTEM_USER = '00000000-0000-4000-8000-0000000000aa';

  const post = (path: string, token: string, body: Record<string, unknown>) =>
    request(fx.app.getHttpServer())
      .post(`/api/v1/purchases/${path}`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const get = (path: string, token: string, query: Record<string, string> = {}) =>
    request(fx.app.getHttpServer())
      .get(`/api/v1/purchases/${path}`)
      .query(query)
      .set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    fx = await createTenantFixture({
      prefix: 'Purchase Test',
      domain: 'purchases.test',
      tables: [
        'purchase_return_lines',
        'purchase_returns',
        'supplier_payment_allocations',
        'supplier_payments',
        'purchase_bill_lines',
        'purchase_bills',
        'goods_receipt_lines',
        'goods_receipts',
        'purchase_order_lines',
        'purchase_orders',
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
      mobilePrefix: '910000009',
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
      .save(ds.getRepository(Warehouse).create({ companyId: fx.companyA.id, siteId: siteA.id, name: 'Raw Yard' }));

    const unit = await ds
      .getRepository(Unit)
      .save(ds.getRepository(Unit).create({ companyId: fx.companyA.id, name: 'Tonnes', abbreviation: 't' }));
    const mkItem = (name: string) =>
      ds.getRepository(Item).save(
        ds.getRepository(Item).create({
          companyId: fx.companyA.id,
          name,
          category: 'raw_material',
          unitId: unit.id,
        }),
      );
    coal = await mkItem('Coal');
    diesel = await mkItem('Diesel');

    const partyService = fx.app.get(PartyService);
    supplier = await partyService.create(fx.companyA.id, SYSTEM_USER, {
      name: 'Bharat Coal Traders',
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
    customerOnly = await partyService.create(fx.companyA.id, SYSTEM_USER, {
      name: 'Only A Customer',
      partyTypes: ['customer'],
      gstin: null,
      pan: null,
      stateCode: null,
      address: null,
      phone: null,
      email: null,
      openingDebit: '0.00',
      openingCredit: '0.00',
    });

    const cash = await ds.query<{ id: string }[]>(
      `SELECT id FROM ledgers WHERE company_id = $1 AND code = 'CASH' LIMIT 1`,
      [fx.companyA.id],
    );
    cashLedgerId = cash[0]!.id;
  });

  afterAll(async () => {
    await fx.close();
  });

  // ──────────────────────────────────────────────────────────────────────────

  describe('PUR-01 purchase order', () => {
    it('raises an order and numbers it', async () => {
      const res = await post('orders', fx.tokenA, {
        supplierPartyId: supplier.id,
        siteId: siteA.id,
        orderDate: '2026-09-01',
        lines: [{ itemId: coal.id, quantity: '100', rate: '5000' }],
      }).expect(201);

      expect(res.body.data.orderNo).toMatch(/^PO-\d{5}$/);
      expect(res.body.data.status).toBe('open');
    });

    it('refuses a party who is not marked as a supplier', async () => {
      const res = await post('orders', fx.tokenA, {
        supplierPartyId: customerOnly.id,
        siteId: siteA.id,
        orderDate: '2026-09-01',
        lines: [{ itemId: coal.id, quantity: '10', rate: '100' }],
      }).expect(422);
      expect(res.body.error.code).toBe('PARTY_NOT_A_SUPPLIER');
    });

    it('refuses an order dated after today', async () => {
      const res = await post('orders', fx.tokenA, {
        supplierPartyId: supplier.id,
        siteId: siteA.id,
        orderDate: '2099-01-01',
        lines: [{ itemId: coal.id, quantity: '10', rate: '100' }],
      }).expect(422);
      expect(res.body.error.code).toBe('PURCHASE_DATE_IN_FUTURE');
    });
  });

  describe('PUR-02 goods receipt → stock', () => {
    let orderId: string;

    beforeAll(async () => {
      const res = await post('orders', fx.tokenA, {
        supplierPartyId: supplier.id,
        siteId: siteA.id,
        orderDate: '2026-09-02',
        lines: [{ itemId: coal.id, quantity: '100', rate: '5000' }],
      }).expect(201);
      orderId = res.body.data.id as string;
    });

    it('receives goods and puts them into stock in the same breath', async () => {
      const res = await post('goods-receipts', fx.tokenA, {
        supplierPartyId: supplier.id,
        siteId: siteA.id,
        purchaseOrderId: orderId,
        receiptDate: '2026-09-05',
        challanNo: 'CH-9001',
        lines: [{ itemId: coal.id, quantity: '60', warehouseId: yardA.id }],
      }).expect(201);
      expect(res.body.data.grnNo).toMatch(/^GRN-\d{5}$/);

      const balance = await request(fx.app.getHttpServer())
        .get('/api/v1/stock/balance')
        .query({ warehouseId: yardA.id, itemId: coal.id })
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);
      expect(balance.body.data.balance).toBe('60.000');
    });

    it('marks the order partial, then received', async () => {
      const partial = await get(`orders/${orderId}`, fx.tokenA).expect(200);
      expect(partial.body.data.order.status).toBe('partial');

      await post('goods-receipts', fx.tokenA, {
        supplierPartyId: supplier.id,
        siteId: siteA.id,
        purchaseOrderId: orderId,
        receiptDate: '2026-09-06',
        lines: [{ itemId: coal.id, quantity: '40', warehouseId: yardA.id }],
      }).expect(201);

      const done = await get(`orders/${orderId}`, fx.tokenA).expect(200);
      expect(done.body.data.order.status).toBe('received');
    });

    it('refuses a receipt against another supplier’s order', async () => {
      const other = await request(fx.app.getHttpServer())
        .post('/api/v1/parties')
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .send({ name: 'Another Supplier', partyTypes: ['supplier'] })
        .expect(201);

      const res = await post('goods-receipts', fx.tokenA, {
        supplierPartyId: other.body.data.id,
        siteId: siteA.id,
        purchaseOrderId: orderId,
        receiptDate: '2026-09-07',
        lines: [{ itemId: coal.id, quantity: '1', warehouseId: yardA.id }],
      }).expect(422);
      expect(res.body.error.code).toBe('PURCHASE_ORDER_SUPPLIER_MISMATCH');
    });
  });

  describe('PUR-03 / GST-03 supplier bill', () => {
    let billId: string;

    it('posts a balanced journal with input GST split out', async () => {
      const res = await post('bills', fx.tokenA, {
        supplierPartyId: supplier.id,
        siteId: siteA.id,
        supplierInvoiceNo: 'INV-77',
        billDate: '2026-09-08',
        dueDate: '2026-10-08',
        lines: [
          // 100 × 5000 = 500,000 taxable; 6 % + 6 % = 60,000 tax; total 560,000
          { itemId: coal.id, quantity: '100', rate: '5000', cgstRate: '6', sgstRate: '6' },
        ],
      }).expect(201);

      billId = res.body.data.id as string;
      expect(res.body.data.taxableAmount).toBe('500000.00');
      expect(res.body.data.cgstAmount).toBe('30000.00');
      expect(res.body.data.sgstAmount).toBe('30000.00');
      expect(res.body.data.igstAmount).toBe('0.00');
      expect(res.body.data.totalAmount).toBe('560000.00');

      // The journal must balance, or PostingService would have refused it.
      const dayBook = await request(fx.app.getHttpServer())
        .get('/api/v1/reports/day-book')
        .query({ from: '2026-09-08', to: '2026-09-08' })
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);
      const entries = dayBook.body.data as { number: string; totalDebit: string }[];
      const entry = entries.find((v) => v.number.includes('PUR'));
      expect(entry).toBeDefined();
      expect(entry!.totalDebit).toBe('560000.00');
    });

    it('refuses a line charging both CGST/SGST and IGST', async () => {
      const res = await post('bills', fx.tokenA, {
        supplierPartyId: supplier.id,
        siteId: siteA.id,
        supplierInvoiceNo: 'INV-78',
        billDate: '2026-09-09',
        lines: [{ itemId: coal.id, quantity: '1', rate: '100', cgstRate: '6', sgstRate: '6', igstRate: '12' }],
      }).expect(400);
      expect(res.body.error.details).toBeDefined();
    });

    it('refuses the same supplier invoice number twice', async () => {
      const res = await post('bills', fx.tokenA, {
        supplierPartyId: supplier.id,
        siteId: siteA.id,
        supplierInvoiceNo: 'INV-77',
        billDate: '2026-09-10',
        lines: [{ itemId: coal.id, quantity: '1', rate: '100' }],
      });
      expect(res.status).toBe(409);
    });

    it('refuses to bill the same goods receipt twice', async () => {
      const grn = await post('goods-receipts', fx.tokenA, {
        supplierPartyId: supplier.id,
        siteId: siteA.id,
        receiptDate: '2026-09-11',
        lines: [{ itemId: diesel.id, quantity: '10', warehouseId: yardA.id }],
      }).expect(201);
      const grnId = grn.body.data.id as string;

      await post('bills', fx.tokenA, {
        supplierPartyId: supplier.id,
        siteId: siteA.id,
        supplierInvoiceNo: 'INV-79',
        billDate: '2026-09-11',
        grnId,
        lines: [{ itemId: diesel.id, quantity: '10', rate: '90' }],
      }).expect(201);

      const second = await post('bills', fx.tokenA, {
        supplierPartyId: supplier.id,
        siteId: siteA.id,
        supplierInvoiceNo: 'INV-80',
        billDate: '2026-09-12',
        grnId,
        lines: [{ itemId: diesel.id, quantity: '10', rate: '90' }],
      }).expect(422);
      expect(second.body.error.code).toBe('GRN_ALREADY_BILLED');
    });

    it('exposes the bill with its lines', async () => {
      const res = await get(`bills/${billId}`, fx.tokenA).expect(200);
      expect(res.body.data.lines).toHaveLength(1);
      expect(res.body.data.lines[0].taxableAmount).toBe('500000.00');
    });
  });

  describe('PUR-04 supplier payment', () => {
    let billId: string;

    beforeAll(async () => {
      const bills = await get('bills', fx.tokenA, { supplierPartyId: supplier.id }).expect(200);
      billId = (bills.body.data as { id: string; supplierInvoiceNo: string }[]).find(
        (b) => b.supplierInvoiceNo === 'INV-77',
      )!.id;
    });

    it('pays part of a bill and leaves the rest outstanding', async () => {
      await post('payments', fx.tokenA, {
        supplierPartyId: supplier.id,
        siteId: siteA.id,
        paymentDate: '2026-09-15',
        mode: 'cash',
        paidFromLedgerId: cashLedgerId,
        allocations: [{ billId, amount: '160000' }],
      }).expect(201);

      const res = await get(`bills/${billId}`, fx.tokenA).expect(200);
      expect(res.body.data.bill.paidAmount).toBe('160000.00');
    });

    it('refuses to allocate more than a bill still owes', async () => {
      const res = await post('payments', fx.tokenA, {
        supplierPartyId: supplier.id,
        siteId: siteA.id,
        paymentDate: '2026-09-16',
        mode: 'cash',
        paidFromLedgerId: cashLedgerId,
        allocations: [{ billId, amount: '500000' }],
      }).expect(422);
      expect(res.body.error.code).toBe('ALLOCATION_EXCEEDS_OUTSTANDING');
    });

    it('refuses the same bill twice in one payment', async () => {
      const res = await post('payments', fx.tokenA, {
        supplierPartyId: supplier.id,
        siteId: siteA.id,
        paymentDate: '2026-09-16',
        mode: 'cash',
        paidFromLedgerId: cashLedgerId,
        allocations: [
          { billId, amount: '100' },
          { billId, amount: '100' },
        ],
      }).expect(422);
      expect(res.body.error.code).toBe('DUPLICATE_BILL_ALLOCATION');
    });

    it('does not let simultaneous payments overpay one bill', async () => {
      // 400,000 still outstanding. Eight concurrent payments of 100,000 each:
      // four may succeed, the rest must be refused. A read-then-write check
      // would let them all through, which is the shape ADR-027 exists to close.
      const attempts = await Promise.allSettled(
        Array.from({ length: 8 }, () =>
          post('payments', fx.tokenA, {
            supplierPartyId: supplier.id,
            siteId: siteA.id,
            paymentDate: '2026-09-17',
            mode: 'cash',
            paidFromLedgerId: cashLedgerId,
            allocations: [{ billId, amount: '100000' }],
          }).then((r) => {
            if (r.status !== 201) throw new Error(String(r.status));
            return r;
          }),
        ),
      );

      const accepted = attempts.filter((a) => a.status === 'fulfilled').length;
      const res = await get(`bills/${billId}`, fx.tokenA).expect(200);

      expect(accepted).toBe(4);
      expect(res.body.data.bill.paidAmount).toBe('560000.00');
    });
  });

  describe('PUR-05 purchase return', () => {
    it('sends goods back, takes them out of stock and debits the supplier', async () => {
      const before = await request(fx.app.getHttpServer())
        .get('/api/v1/stock/balance')
        .query({ warehouseId: yardA.id, itemId: coal.id })
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);

      const res = await post('returns', fx.tokenA, {
        supplierPartyId: supplier.id,
        siteId: siteA.id,
        returnDate: '2026-09-18',
        reason: 'Wet coal, rejected at the gate',
        lines: [{ itemId: coal.id, quantity: '10', rate: '5000', cgstRate: '6', sgstRate: '6', warehouseId: yardA.id }],
      }).expect(201);

      expect(res.body.data.taxableAmount).toBe('50000.00');
      expect(res.body.data.taxAmount).toBe('6000.00');
      expect(res.body.data.totalAmount).toBe('56000.00');

      const after = await request(fx.app.getHttpServer())
        .get('/api/v1/stock/balance')
        .query({ warehouseId: yardA.id, itemId: coal.id })
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);
      expect(Number(before.body.data.balance) - Number(after.body.data.balance)).toBe(10);
    });

    it('refuses to return more than the yard holds', async () => {
      const res = await post('returns', fx.tokenA, {
        supplierPartyId: supplier.id,
        siteId: siteA.id,
        returnDate: '2026-09-19',
        reason: 'Trying to return stock that was already consumed',
        lines: [{ itemId: coal.id, quantity: '99999', rate: '5000', warehouseId: yardA.id }],
      }).expect(422);
      expect(res.body.error.code).toBe('STOCK_INSUFFICIENT');
    });
  });

  describe('PUR-06 payables ageing', () => {
    it('buckets what is owed by how long it has been due', async () => {
      await post('bills', fx.tokenA, {
        supplierPartyId: supplier.id,
        siteId: siteA.id,
        supplierInvoiceNo: 'INV-OLD',
        billDate: '2026-06-01',
        dueDate: '2026-06-15',
        lines: [{ itemId: coal.id, quantity: '1', rate: '1000' }],
      }).expect(201);

      const res = await get('payables-ageing', fx.tokenA, { asOf: '2026-09-30' }).expect(200);
      interface AgeingSupplier {
        supplierName: string;
        outstanding: string;
        bills: { supplierInvoiceNo: string; bucket: string }[];
      }
      const entry = (res.body.data.suppliers as AgeingSupplier[]).find((s) => s.supplierName === 'Bharat Coal Traders');

      expect(entry).toBeDefined();
      // Due 15 June, read on 30 September — more than 90 days late.
      expect(entry!.bills.find((b) => b.supplierInvoiceNo === 'INV-OLD')?.bucket).toBe('d90_plus');
      expect(Number(res.body.data.totals.outstanding)).toBeGreaterThan(0);
    });
  });

  describe('tenancy and permissions', () => {
    it('shows company B none of company A purchases', async () => {
      const res = await get('bills', fx.tokenB).expect(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('refuses a supplier belonging to another company', async () => {
      const res = await post('orders', fx.tokenB, {
        supplierPartyId: supplier.id,
        siteId: siteA.id,
        orderDate: '2026-09-01',
        lines: [{ itemId: coal.id, quantity: '1', rate: '1' }],
      }).expect(422);
      expect(res.body.error.code).toBe('SUPPLIER_NOT_FOUND');
    });

    it('rejects a request with no bearer token', async () => {
      await request(fx.app.getHttpServer()).get('/api/v1/purchases/bills').expect(401);
    });
  });
});
