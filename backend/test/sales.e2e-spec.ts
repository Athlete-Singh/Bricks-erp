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

/** P8 — SAL-01…07 against real Postgres. Mirror of the purchases spec. */
describe('Sales (e2e)', () => {
  let fx: TenantFixture;
  let ds: DataSource;
  let siteA: Site;
  let yardA: Warehouse;
  let bricks: Item;
  let customer: Party;
  let supplierOnly: Party;
  let cashLedgerId: string;

  const SYSTEM_USER = '00000000-0000-4000-8000-0000000000ab';

  const post = (path: string, token: string, body: Record<string, unknown>) =>
    request(fx.app.getHttpServer()).post(`/api/v1/sales/${path}`).set('Authorization', `Bearer ${token}`).send(body);

  const patch = (path: string, token: string, body: Record<string, unknown>) =>
    request(fx.app.getHttpServer()).patch(`/api/v1/sales/${path}`).set('Authorization', `Bearer ${token}`).send(body);

  const get = (path: string, token: string, query: Record<string, string> = {}) =>
    request(fx.app.getHttpServer()).get(`/api/v1/sales/${path}`).query(query).set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    fx = await createTenantFixture({
      prefix: 'Sales Test',
      domain: 'sales.test',
      tables: [
        'debit_note_lines',
        'debit_notes',
        'credit_note_lines',
        'credit_notes',
        'customer_receipt_allocations',
        'customer_receipts',
        'sales_charges',
        'sales_invoice_lines',
        'sales_invoices',
        'sales_order_lines',
        'sales_orders',
        'quotation_lines',
        'quotations',
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
      mobilePrefix: '910000010',
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
      .save(
        ds.getRepository(Warehouse).create({ companyId: fx.companyA.id, siteId: siteA.id, name: 'Finished Stock' }),
      );

    const unit = await ds
      .getRepository(Unit)
      .save(ds.getRepository(Unit).create({ companyId: fx.companyA.id, name: 'Thousand', abbreviation: 'K' }));
    bricks = await ds.getRepository(Item).save(
      ds.getRepository(Item).create({
        companyId: fx.companyA.id,
        name: 'Class 1 Brick',
        category: 'other',
        unitId: unit.id,
      }),
    );

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
    supplierOnly = await partyService.create(fx.companyA.id, SYSTEM_USER, {
      name: 'Only A Supplier',
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

    const cash = await ds.query<{ id: string }[]>(
      `SELECT id FROM ledgers WHERE company_id = $1 AND code = 'CASH' LIMIT 1`,
      [fx.companyA.id],
    );
    cashLedgerId = cash[0]!.id;

    // Prime the yard — sales need stock to leave from.
    const stock = fx.app.get(StockService);
    await ds.transaction((manager) =>
      stock.record(manager, {
        companyId: fx.companyA.id,
        userId: SYSTEM_USER,
        warehouseId: yardA.id,
        itemId: bricks.id,
        movementType: 'opening',
        direction: 'in',
        quantity: '1000.000',
        movementDate: '2026-08-01',
        sourceType: 'opening_balance',
        sourceId: null,
        notes: 'Opening stock',
      }),
    );
  });

  afterAll(async () => {
    await fx.close();
  });

  // ──────────────────────────────────────────────────────────────────────────

  describe('SAL-01 quotation', () => {
    it('raises a quote with GST computed and numbers it', async () => {
      const res = await post('quotations', fx.tokenA, {
        customerPartyId: customer.id,
        siteId: siteA.id,
        quoteDate: '2026-09-01',
        validUntil: '2026-09-30',
        lines: [{ itemId: bricks.id, quantity: '10', rate: '7000', cgstRate: '6', sgstRate: '6' }],
      }).expect(201);

      expect(res.body.data.quoteNo).toMatch(/^QUO-\d{5}$/);
      expect(res.body.data.status).toBe('draft');
      // 10 × 7000 = 70,000 taxable; 6 % + 6 % = 8,400 tax; total 78,400.
      expect(res.body.data.taxableAmount).toBe('70000.00');
      expect(res.body.data.cgstAmount).toBe('4200.00');
      expect(res.body.data.sgstAmount).toBe('4200.00');
      expect(res.body.data.totalAmount).toBe('78400.00');
    });

    it('refuses a party who is not marked as a customer', async () => {
      const res = await post('quotations', fx.tokenA, {
        customerPartyId: supplierOnly.id,
        siteId: siteA.id,
        quoteDate: '2026-09-01',
        lines: [{ itemId: bricks.id, quantity: '1', rate: '7000', cgstRate: '6', sgstRate: '6' }],
      }).expect(422);
      expect(res.body.error.code).toBe('PARTY_NOT_A_CUSTOMER');
    });

    it('refuses a line charging both CGST/SGST and IGST', async () => {
      const res = await post('quotations', fx.tokenA, {
        customerPartyId: customer.id,
        siteId: siteA.id,
        quoteDate: '2026-09-01',
        lines: [{ itemId: bricks.id, quantity: '1', rate: '1', cgstRate: '6', sgstRate: '6', igstRate: '12' }],
      }).expect(400);
      expect(res.body.error).toBeDefined();
    });

    it('refuses a line discount that exceeds the line value', async () => {
      const res = await post('quotations', fx.tokenA, {
        customerPartyId: customer.id,
        siteId: siteA.id,
        quoteDate: '2026-09-01',
        lines: [{ itemId: bricks.id, quantity: '10', rate: '100', discount: '9999' }],
      }).expect(422);
      expect(res.body.error.code).toBe('SALES_LINE_DISCOUNT_EXCEEDS_VALUE');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────

  describe('SAL-02 sales order', () => {
    let quoteId: string;

    beforeAll(async () => {
      const q = await post('quotations', fx.tokenA, {
        customerPartyId: customer.id,
        siteId: siteA.id,
        quoteDate: '2026-09-02',
        lines: [{ itemId: bricks.id, quantity: '20', rate: '7000', cgstRate: '6', sgstRate: '6' }],
      }).expect(201);
      quoteId = q.body.data.id as string;
    });

    it('converts a quote to an order and marks the quote accepted', async () => {
      const res = await post('orders', fx.tokenA, {
        customerPartyId: customer.id,
        siteId: siteA.id,
        quotationId: quoteId,
        orderDate: '2026-09-05',
        lines: [{ itemId: bricks.id, quantity: '20', rate: '7000', cgstRate: '6', sgstRate: '6' }],
      }).expect(201);

      expect(res.body.data.orderNo).toMatch(/^SO-\d{5}$/);
      expect(res.body.data.status).toBe('open');

      const q = await get(`quotations/${quoteId}`, fx.tokenA).expect(200);
      expect(q.body.data.quote.status).toBe('accepted');
    });

    it('refuses converting a quote from another customer', async () => {
      const other = await request(fx.app.getHttpServer())
        .post('/api/v1/parties')
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .send({ name: 'Another Customer', partyTypes: ['customer'] })
        .expect(201);

      const res = await post('orders', fx.tokenA, {
        customerPartyId: other.body.data.id,
        siteId: siteA.id,
        quotationId: quoteId,
        orderDate: '2026-09-06',
        lines: [{ itemId: bricks.id, quantity: '1', rate: '7000' }],
      }).expect(422);
      expect(res.body.error.code).toBe('QUOTATION_CUSTOMER_MISMATCH');
    });

    it('refuses an order dated in the future', async () => {
      const res = await post('orders', fx.tokenA, {
        customerPartyId: customer.id,
        siteId: siteA.id,
        orderDate: '2099-01-01',
        lines: [{ itemId: bricks.id, quantity: '1', rate: '7000' }],
      }).expect(422);
      expect(res.body.error.code).toBe('SALES_DATE_IN_FUTURE');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────

  describe('SAL-03 tax invoice (stock OUT + journal in one tx)', () => {
    let invoiceId: string;
    let soId: string;

    beforeAll(async () => {
      const so = await post('orders', fx.tokenA, {
        customerPartyId: customer.id,
        siteId: siteA.id,
        orderDate: '2026-09-10',
        lines: [{ itemId: bricks.id, quantity: '100', rate: '7000', cgstRate: '6', sgstRate: '6' }],
      }).expect(201);
      soId = so.body.data.id as string;
    });

    it('issues an invoice, splits GST same-state, deducts stock, posts a balanced journal', async () => {
      const before = await request(fx.app.getHttpServer())
        .get('/api/v1/stock/balance')
        .query({ warehouseId: yardA.id, itemId: bricks.id })
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);

      const res = await post('invoices', fx.tokenA, {
        customerPartyId: customer.id,
        siteId: siteA.id,
        salesOrderId: soId,
        invoiceDate: '2026-09-11',
        dueDate: '2026-10-11',
        lines: [
          // 50 × 7000 = 350,000 taxable; 6 % + 6 % = 42,000 tax; total 392,000.
          {
            itemId: bricks.id,
            warehouseId: yardA.id,
            quantity: '50',
            rate: '7000',
            cgstRate: '6',
            sgstRate: '6',
            hsnCode: '6904',
          },
        ],
        charges: [{ kind: 'loading', label: 'Loading at kiln', amount: '2000', cgstRate: '6', sgstRate: '6' }],
      }).expect(201);

      invoiceId = res.body.data.id as string;
      // Totals: 350,000 bricks + 2,000 loading = 352,000 taxable;
      // 6% + 6% on 352,000 = 42,240; total 394,240.
      expect(res.body.data.taxableAmount).toBe('352000.00');
      expect(res.body.data.cgstAmount).toBe('21120.00');
      expect(res.body.data.sgstAmount).toBe('21120.00');
      expect(res.body.data.igstAmount).toBe('0.00');
      expect(res.body.data.totalAmount).toBe('394240.00');
      expect(res.body.data.invoiceNo).toMatch(/^SAL\//);

      const after = await request(fx.app.getHttpServer())
        .get('/api/v1/stock/balance')
        .query({ warehouseId: yardA.id, itemId: bricks.id })
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);
      expect(Number(before.body.data.balance) - Number(after.body.data.balance)).toBe(50);

      // Journal balanced — Day Book will show a SAL voucher at 394,240.
      const dayBook = await request(fx.app.getHttpServer())
        .get('/api/v1/reports/day-book')
        .query({ from: '2026-09-11', to: '2026-09-11' })
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);
      const entries = dayBook.body.data as { number: string; totalDebit: string }[];
      const entry = entries.find((v) => v.number.includes('SAL'));
      expect(entry).toBeDefined();
      expect(entry!.totalDebit).toBe('394240.00');

      // Order moves to partial.
      const so = await get(`orders/${soId}`, fx.tokenA).expect(200);
      expect(so.body.data.order.status).toBe('partial');
    });

    it('refuses an invoice that would drive stock below zero (atomicity)', async () => {
      const res = await post('invoices', fx.tokenA, {
        customerPartyId: customer.id,
        siteId: siteA.id,
        invoiceDate: '2026-09-11',
        lines: [
          { itemId: bricks.id, warehouseId: yardA.id, quantity: '99999', rate: '7000', cgstRate: '6', sgstRate: '6' },
        ],
      }).expect(422);
      expect(res.body.error.code).toBe('STOCK_INSUFFICIENT');
    });

    it('exposes the invoice with its lines, charges and empty allocations', async () => {
      const res = await get(`invoices/${invoiceId}`, fx.tokenA).expect(200);
      expect(res.body.data.lines).toHaveLength(1);
      expect(res.body.data.charges).toHaveLength(1);
      expect(res.body.data.allocations).toHaveLength(0);
    });

    it('renders a PDF for the invoice', async () => {
      const res = await request(fx.app.getHttpServer())
        .get(`/api/v1/sales/invoices/${invoiceId}/pdf`)
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);
      expect(res.header['content-type']).toContain('application/pdf');
      // A real PDF starts with the magic bytes %PDF.
      const body = res.body as Buffer;
      expect(body.subarray(0, 4).toString()).toBe('%PDF');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────

  describe('SAL-05 customer receipt (bill-wise)', () => {
    let invoiceId: string;

    beforeAll(async () => {
      // Find the previous invoice to settle.
      const invoices = await get('invoices', fx.tokenA, { customerPartyId: customer.id }).expect(200);
      invoiceId = (invoices.body.data as { id: string }[])[0]!.id;
    });

    it('allocates a receipt invoice-by-invoice and marks it partial', async () => {
      await post('receipts', fx.tokenA, {
        customerPartyId: customer.id,
        siteId: siteA.id,
        receiptDate: '2026-09-15',
        mode: 'cash',
        depositToLedgerId: cashLedgerId,
        allocations: [{ invoiceId, amount: '100000' }],
      }).expect(201);

      const res = await get(`invoices/${invoiceId}`, fx.tokenA).expect(200);
      expect(res.body.data.invoice.paidAmount).toBe('100000.00');
      expect(res.body.data.invoice.status).toBe('partial');
    });

    it('refuses to over-allocate an invoice', async () => {
      const res = await post('receipts', fx.tokenA, {
        customerPartyId: customer.id,
        siteId: siteA.id,
        receiptDate: '2026-09-16',
        mode: 'cash',
        depositToLedgerId: cashLedgerId,
        allocations: [{ invoiceId, amount: '9999999' }],
      }).expect(422);
      expect(res.body.error.code).toBe('ALLOCATION_EXCEEDS_OUTSTANDING');
    });

    it('refuses the same invoice twice in one receipt', async () => {
      const res = await post('receipts', fx.tokenA, {
        customerPartyId: customer.id,
        siteId: siteA.id,
        receiptDate: '2026-09-16',
        mode: 'cash',
        depositToLedgerId: cashLedgerId,
        allocations: [
          { invoiceId, amount: '100' },
          { invoiceId, amount: '100' },
        ],
      }).expect(422);
      expect(res.body.error.code).toBe('DUPLICATE_INVOICE_ALLOCATION');
    });

    it('does not let simultaneous receipts overcollect one invoice', async () => {
      // 294,240 still outstanding. Eight concurrent receipts of 100,000 each:
      // two may succeed, the rest must be refused (ADR-027 applies here too).
      const attempts = await Promise.allSettled(
        Array.from({ length: 8 }, () =>
          post('receipts', fx.tokenA, {
            customerPartyId: customer.id,
            siteId: siteA.id,
            receiptDate: '2026-09-17',
            mode: 'cash',
            depositToLedgerId: cashLedgerId,
            allocations: [{ invoiceId, amount: '100000' }],
          }).then((r) => {
            if (r.status !== 201) throw new Error(String(r.status));
            return r;
          }),
        ),
      );
      const accepted = attempts.filter((a) => a.status === 'fulfilled').length;
      const res = await get(`invoices/${invoiceId}`, fx.tokenA).expect(200);
      expect(accepted).toBe(2);
      expect(res.body.data.invoice.paidAmount).toBe('300000.00');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────

  describe('SAL-06 credit / debit notes', () => {
    let invoiceId: string;

    beforeAll(async () => {
      const invoices = await get('invoices', fx.tokenA, { customerPartyId: customer.id }).expect(200);
      invoiceId = (invoices.body.data as { id: string }[])[0]!.id;
    });

    it('issues a credit note that re-stocks returned bricks', async () => {
      const before = await request(fx.app.getHttpServer())
        .get('/api/v1/stock/balance')
        .query({ warehouseId: yardA.id, itemId: bricks.id })
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);

      const res = await post('credit-notes', fx.tokenA, {
        customerPartyId: customer.id,
        siteId: siteA.id,
        invoiceId,
        noteDate: '2026-09-20',
        reason: 'Five bricks arrived broken',
        lines: [
          {
            itemId: bricks.id,
            warehouseId: yardA.id,
            quantity: '5',
            rate: '7000',
            cgstRate: '6',
            sgstRate: '6',
          },
        ],
      }).expect(201);

      expect(res.body.data.restocked).toBe(true);
      expect(res.body.data.taxableAmount).toBe('35000.00');
      expect(res.body.data.taxAmount).toBe('4200.00');
      expect(res.body.data.totalAmount).toBe('39200.00');

      const after = await request(fx.app.getHttpServer())
        .get('/api/v1/stock/balance')
        .query({ warehouseId: yardA.id, itemId: bricks.id })
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);
      expect(Number(after.body.data.balance) - Number(before.body.data.balance)).toBe(5);
    });

    it('issues a value-only credit (no quantity) without touching stock', async () => {
      const before = await request(fx.app.getHttpServer())
        .get('/api/v1/stock/balance')
        .query({ warehouseId: yardA.id, itemId: bricks.id })
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);

      const res = await post('credit-notes', fx.tokenA, {
        customerPartyId: customer.id,
        siteId: siteA.id,
        invoiceId,
        noteDate: '2026-09-21',
        reason: 'Agreed price reduction',
        lines: [{ itemId: bricks.id, rate: '1000', cgstRate: '6', sgstRate: '6' }],
      }).expect(201);
      expect(res.body.data.restocked).toBe(false);

      const after = await request(fx.app.getHttpServer())
        .get('/api/v1/stock/balance')
        .query({ warehouseId: yardA.id, itemId: bricks.id })
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);
      expect(after.body.data.balance).toBe(before.body.data.balance);
    });

    it('issues a debit note that posts the mirror journal', async () => {
      const res = await post('debit-notes', fx.tokenA, {
        customerPartyId: customer.id,
        siteId: siteA.id,
        invoiceId,
        noteDate: '2026-09-22',
        reason: 'Underbilled transport',
        lines: [{ itemId: bricks.id, rate: '1500', cgstRate: '6', sgstRate: '6' }],
      }).expect(201);
      expect(res.body.data.totalAmount).toBe('1680.00');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────

  describe('SAL-07 receivables ageing', () => {
    it('buckets outstanding invoices by how long they have been due', async () => {
      // Add an old overdue invoice.
      await post('invoices', fx.tokenA, {
        customerPartyId: customer.id,
        siteId: siteA.id,
        invoiceDate: '2026-06-01',
        dueDate: '2026-06-15',
        lines: [
          { itemId: bricks.id, warehouseId: yardA.id, quantity: '1', rate: '1000', cgstRate: '6', sgstRate: '6' },
        ],
      }).expect(201);

      const res = await get('receivables-ageing', fx.tokenA, { asOf: '2026-09-30' }).expect(200);
      interface AgeingCustomer {
        customerName: string;
        outstanding: string;
        invoices: { bucket: string; invoiceNo: string }[];
      }
      const entry = (res.body.data.customers as AgeingCustomer[]).find(
        (c) => c.customerName === 'Shri Krishna Builders',
      );
      expect(entry).toBeDefined();
      expect(entry!.invoices.find((i) => i.bucket === 'd90_plus')).toBeDefined();
      expect(Number(res.body.data.totals.outstanding)).toBeGreaterThan(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────

  describe('tenancy and permissions', () => {
    it('shows company B none of company A invoices', async () => {
      const res = await get('invoices', fx.tokenB).expect(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('refuses a customer belonging to another company', async () => {
      const res = await post('quotations', fx.tokenB, {
        customerPartyId: customer.id,
        siteId: siteA.id,
        quoteDate: '2026-09-01',
        lines: [{ itemId: bricks.id, quantity: '1', rate: '1' }],
      }).expect(422);
      expect(res.body.error.code).toBe('CUSTOMER_NOT_FOUND');
    });

    it('rejects a request with no bearer token', async () => {
      await request(fx.app.getHttpServer()).get('/api/v1/sales/invoices').expect(401);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────

  describe('idempotency', () => {
    it('returns the same quote on a replay with the same key', async () => {
      const key = 'sal-idemp-1';
      const body = {
        customerPartyId: customer.id,
        siteId: siteA.id,
        quoteDate: '2026-09-25',
        lines: [{ itemId: bricks.id, quantity: '1', rate: '7000', cgstRate: '6', sgstRate: '6' }],
      };
      const first = await request(fx.app.getHttpServer())
        .post('/api/v1/sales/quotations')
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .set('Idempotency-Key', key)
        .send(body)
        .expect(201);
      const second = await request(fx.app.getHttpServer())
        .post('/api/v1/sales/quotations')
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .set('Idempotency-Key', key)
        .send(body)
        .expect(201);
      expect(first.body.data.id).toBe(second.body.data.id);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────

  describe('quotation status machine', () => {
    it('refuses a status change on a terminal quote', async () => {
      const q = await post('quotations', fx.tokenA, {
        customerPartyId: customer.id,
        siteId: siteA.id,
        quoteDate: '2026-09-26',
        lines: [{ itemId: bricks.id, quantity: '1', rate: '7000', cgstRate: '6', sgstRate: '6' }],
      }).expect(201);
      await patch(`quotations/${q.body.data.id}/status`, fx.tokenA, { status: 'cancelled' }).expect(200);
      const second = await patch(`quotations/${q.body.data.id}/status`, fx.tokenA, {
        status: 'sent',
      }).expect(422);
      expect(second.body.error.code).toBe('QUOTATION_TERMINAL');
    });
  });
});
