import request from 'supertest';
import { DataSource } from 'typeorm';
import { Site } from '../src/modules/company/entities/site.entity';
import { Warehouse } from '../src/modules/inventory/entities/warehouse.entity';
import { Unit } from '../src/modules/inventory/entities/unit.entity';
import { Item } from '../src/modules/inventory/entities/item.entity';
import { Party } from '../src/modules/parties/entities/party.entity';
import { Vehicle } from '../src/modules/transport/entities/vehicle.entity';
import { VehicleType, VehicleOwnerType } from '@brics/shared';
import { Driver } from '../src/modules/transport/entities/driver.entity';
import { FinancialYear } from '../src/modules/company/entities/financial-year.entity';
import { seedChartForCompany } from '../src/accounting/chart-of-accounts.seed';
import { PartyService } from '../src/modules/parties/party.service';
import { StockService } from '../src/stock/stock.service';
import { createTenantFixture, type TenantFixture } from './helpers/tenant-fixture';

jest.setTimeout(60000);

/**
 * P9.1a — DSP-01…03, DSP-05 and the LEK-04 gate reconciliation, against real
 * Postgres.
 *
 * The thing worth proving here is ADR-041: the bricks leave the yard exactly
 * once, whichever document came first. Everything else is guard rails around
 * that one invariant.
 */
describe('Dispatch (e2e)', () => {
  let fx: TenantFixture;
  let ds: DataSource;
  let siteA: Site;
  let yardA: Warehouse;
  let bricks: Item;
  let seconds: Item;
  let customer: Party;
  let supplierOnly: Party;
  let truck: Vehicle;
  let driver: Driver;

  const SYSTEM_USER = '00000000-0000-4000-8000-0000000000aa';

  /** One row of the LEK-04 report, as the endpoint returns it. */
  interface GateRow {
    challanNo: string;
    invoiceNo: string | null;
    dispatchedQuantity: string;
    invoicedQuantity: string | null;
    stockMovedBy: 'dispatch' | 'invoice';
    unbilled: boolean;
    quantityMismatch: boolean;
  }

  const post = (path: string, token: string, body: Record<string, unknown>) =>
    request(fx.app.getHttpServer()).post(`/api/v1/${path}`).set('Authorization', `Bearer ${token}`).send(body);

  const patch = (path: string, token: string, body: Record<string, unknown>) =>
    request(fx.app.getHttpServer()).patch(`/api/v1/${path}`).set('Authorization', `Bearer ${token}`).send(body);

  const get = (path: string, token: string, query: Record<string, string> = {}) =>
    request(fx.app.getHttpServer()).get(`/api/v1/${path}`).query(query).set('Authorization', `Bearer ${token}`);

  /** Quantity on hand, straight from the ledger rather than from any report. */
  const onHand = async (itemId: string): Promise<number> => {
    const rows = await ds.query<{ qty: string | null }[]>(
      `SELECT COALESCE(SUM("quantity_in") - SUM("quantity_out"), 0) AS qty
         FROM stock_movements WHERE company_id = $1 AND item_id = $2 AND deleted_at IS NULL`,
      [fx.companyA.id, itemId],
    );
    return Number(rows[0]?.qty ?? 0);
  };

  beforeAll(async () => {
    fx = await createTenantFixture({
      prefix: 'Dispatch Test',
      domain: 'dispatch.test',
      tables: [
        'dispatch_lines',
        'dispatches',
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
        'transport_vehicles',
        'transport_drivers',
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
      mobilePrefix: '910000011',
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

    truck = await ds.getRepository(Vehicle).save(
      ds.getRepository(Vehicle).create({
        companyId: fx.companyA.id,
        registrationNo: 'UP32 AB 1234',
        type: VehicleType.TRUCK,
        ownerType: VehicleOwnerType.OWN,
        partyId: null,
        isActive: true,
      }),
    );
    driver = await ds
      .getRepository(Driver)
      .save(ds.getRepository(Driver).create({ companyId: fx.companyA.id, name: 'Ramesh', isActive: true }));

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

    // Prime the yard — a challan needs bricks to carry.
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
          quantity: '100000.000',
          movementDate: '2026-08-01',
          sourceType: 'opening_balance',
          sourceId: null,
          notes: 'Opening stock',
        });
      }
    });
  });

  afterAll(async () => {
    await fx.close();
  });

  // ──────────────────────────────────────────────────────────────────────────

  describe('DSP-01 raising a challan', () => {
    it('numbers the challan and leaves it a draft', async () => {
      const res = await post('dispatches', fx.tokenA, {
        siteId: siteA.id,
        customerPartyId: customer.id,
        vehicleId: truck.id,
        driverId: driver.id,
        dispatchDate: '2026-09-01',
        deliveryLocation: 'Site 4, Ring Road',
        lines: [{ itemId: bricks.id, warehouseId: yardA.id, quantity: '5000' }],
      }).expect(201);

      expect(res.body.data.challanNo).toMatch(/^CHL-\d{5}$/);
      expect(res.body.data.status).toBe('draft');
      // A draft has not left the gate, so nothing moved yet.
      expect(res.body.data.movedStock).toBe(false);
    });

    it('refuses a party who is not marked as a customer', async () => {
      const res = await post('dispatches', fx.tokenA, {
        siteId: siteA.id,
        customerPartyId: supplierOnly.id,
        dispatchDate: '2026-09-01',
        lines: [{ itemId: bricks.id, warehouseId: yardA.id, quantity: '100' }],
      }).expect(422);
      expect(res.body.error.code).toBe('PARTY_NOT_A_CUSTOMER');
    });

    it('refuses a future-dated challan (ADR-028)', async () => {
      const res = await post('dispatches', fx.tokenA, {
        siteId: siteA.id,
        customerPartyId: customer.id,
        dispatchDate: '2099-01-01',
        lines: [{ itemId: bricks.id, warehouseId: yardA.id, quantity: '100' }],
      }).expect(422);
      expect(res.body.error.code).toBe('DISPATCH_DATE_IN_FUTURE');
    });

    it('refuses the same grade twice from one yard on one challan', async () => {
      await post('dispatches', fx.tokenA, {
        siteId: siteA.id,
        customerPartyId: customer.id,
        dispatchDate: '2026-09-01',
        lines: [
          { itemId: bricks.id, warehouseId: yardA.id, quantity: '100' },
          { itemId: bricks.id, warehouseId: yardA.id, quantity: '200' },
        ],
      }).expect(400);
    });

    it('refuses an id belonging to another company (ADR-021)', async () => {
      const res = await post('dispatches', fx.tokenB, {
        siteId: siteA.id,
        customerPartyId: customer.id,
        dispatchDate: '2026-09-01',
        lines: [{ itemId: bricks.id, warehouseId: yardA.id, quantity: '100' }],
      }).expect(422);
      expect(res.body.error.code).toBe('CUSTOMER_NOT_FOUND');
    });
  });

  describe('DSP-02 confirming the truck out of the gate', () => {
    it('deducts the yard when there is no invoice yet (challan-first)', async () => {
      const before = await onHand(bricks.id);

      const created = await post('dispatches', fx.tokenA, {
        siteId: siteA.id,
        customerPartyId: customer.id,
        dispatchDate: '2026-09-02',
        lines: [{ itemId: bricks.id, warehouseId: yardA.id, quantity: '4000' }],
      }).expect(201);

      // Still a draft: raising the paperwork moves nothing.
      expect(await onHand(bricks.id)).toBe(before);

      const confirmed = await patch(`dispatches/${created.body.data.id}/confirm`, fx.tokenA, {}).expect(200);
      expect(confirmed.body.data.status).toBe('confirmed');
      expect(confirmed.body.data.movedStock).toBe(true);
      expect(await onHand(bricks.id)).toBe(before - 4000);
    });

    it('refuses to confirm twice — the yard is not deducted a second time', async () => {
      const created = await post('dispatches', fx.tokenA, {
        siteId: siteA.id,
        customerPartyId: customer.id,
        dispatchDate: '2026-09-02',
        lines: [{ itemId: seconds.id, warehouseId: yardA.id, quantity: '1000' }],
      }).expect(201);

      await patch(`dispatches/${created.body.data.id}/confirm`, fx.tokenA, {}).expect(200);
      const after = await onHand(seconds.id);

      const second = await patch(`dispatches/${created.body.data.id}/confirm`, fx.tokenA, {}).expect(422);
      expect(second.body.error.code).toBe('DISPATCH_NOT_DRAFT');
      expect(await onHand(seconds.id)).toBe(after);
    });

    it('rolls the whole confirm back when the yard cannot cover it (ADR-026)', async () => {
      const before = await onHand(bricks.id);

      const created = await post('dispatches', fx.tokenA, {
        siteId: siteA.id,
        customerPartyId: customer.id,
        dispatchDate: '2026-09-02',
        lines: [{ itemId: bricks.id, warehouseId: yardA.id, quantity: '999999999' }],
      }).expect(201);

      await patch(`dispatches/${created.body.data.id}/confirm`, fx.tokenA, {}).expect(422);

      // Nothing moved, and the challan is still a draft to be corrected.
      expect(await onHand(bricks.id)).toBe(before);
      const reread = await get(`dispatches/${created.body.data.id}`, fx.tokenA).expect(200);
      expect(reread.body.data.status).toBe('draft');
      expect(reread.body.data.movedStock).toBe(false);
    });

    it('eight simultaneous confirms deduct the yard exactly once (ADR-027)', async () => {
      const before = await onHand(seconds.id);
      const created = await post('dispatches', fx.tokenA, {
        siteId: siteA.id,
        customerPartyId: customer.id,
        dispatchDate: '2026-09-03',
        lines: [{ itemId: seconds.id, warehouseId: yardA.id, quantity: '2500' }],
      }).expect(201);

      const results = await Promise.all(
        Array.from({ length: 8 }, () => patch(`dispatches/${created.body.data.id}/confirm`, fx.tokenA, {})),
      );

      expect(results.filter((r) => r.status === 200)).toHaveLength(1);
      expect(await onHand(seconds.id)).toBe(before - 2500);
    });
  });

  describe('DSP-03 delivery acknowledgement', () => {
    let challanId: string;

    beforeAll(async () => {
      const created = await post('dispatches', fx.tokenA, {
        siteId: siteA.id,
        customerPartyId: customer.id,
        dispatchDate: '2026-09-05',
        lines: [{ itemId: bricks.id, warehouseId: yardA.id, quantity: '1500' }],
      }).expect(201);
      challanId = created.body.data.id;
    });

    it('refuses to sign for a load that has not left yet', async () => {
      const res = await patch(`dispatches/${challanId}/acknowledge`, fx.tokenA, {
        receivedBy: 'Site engineer',
        deliveredOn: '2026-09-05',
      }).expect(422);
      expect(res.body.error.code).toBe('DISPATCH_NOT_CONFIRMED');
    });

    it('records who received it and when', async () => {
      await patch(`dispatches/${challanId}/confirm`, fx.tokenA, {}).expect(200);

      const res = await patch(`dispatches/${challanId}/acknowledge`, fx.tokenA, {
        receivedBy: 'Site engineer',
        deliveredOn: '2026-09-06',
        deliveryRemarks: 'Two broken, noted on the copy',
      }).expect(200);

      expect(res.body.data.status).toBe('delivered');
      expect(res.body.data.receivedBy).toBe('Site engineer');
      expect(res.body.data.deliveredOn).toBe('2026-09-06');
    });

    it('refuses a second signature', async () => {
      const res = await patch(`dispatches/${challanId}/acknowledge`, fx.tokenA, {
        receivedBy: 'Someone else',
        deliveredOn: '2026-09-07',
      }).expect(422);
      expect(res.body.error.code).toBe('DISPATCH_ALREADY_DELIVERED');
    });

    it('refuses a delivery dated before the truck left', async () => {
      const created = await post('dispatches', fx.tokenA, {
        siteId: siteA.id,
        customerPartyId: customer.id,
        dispatchDate: '2026-09-10',
        lines: [{ itemId: bricks.id, warehouseId: yardA.id, quantity: '500' }],
      }).expect(201);
      await patch(`dispatches/${created.body.data.id}/confirm`, fx.tokenA, {}).expect(200);

      const res = await patch(`dispatches/${created.body.data.id}/acknowledge`, fx.tokenA, {
        receivedBy: 'Storeman',
        deliveredOn: '2026-09-09',
      }).expect(422);
      expect(res.body.error.code).toBe('DELIVERY_BEFORE_DISPATCH');
    });
  });

  describe('ADR-041 — the bricks leave the yard exactly once', () => {
    it('invoice-first: the challan carries the goods but moves no stock', async () => {
      const before = await onHand(bricks.id);

      const invoice = await post('sales/invoices', fx.tokenA, {
        customerPartyId: customer.id,
        siteId: siteA.id,
        invoiceDate: '2026-09-12',
        lines: [
          {
            itemId: bricks.id,
            warehouseId: yardA.id,
            quantity: '3000',
            rate: '7',
            cgstRate: '6',
            sgstRate: '6',
            igstRate: '0',
          },
        ],
      }).expect(201);

      // The invoice is what deducted (ADR-038).
      expect(await onHand(bricks.id)).toBe(before - 3000);

      const challan = await post('dispatches', fx.tokenA, {
        siteId: siteA.id,
        customerPartyId: customer.id,
        salesInvoiceId: invoice.body.data.id,
        dispatchDate: '2026-09-12',
        lines: [{ itemId: bricks.id, warehouseId: yardA.id, quantity: '3000' }],
      }).expect(201);

      const confirmed = await patch(`dispatches/${challan.body.data.id}/confirm`, fx.tokenA, {}).expect(200);
      expect(confirmed.body.data.movedStock).toBe(false);
      // Still deducted once in total, not twice.
      expect(await onHand(bricks.id)).toBe(before - 3000);
    });

    it('challan-first: the invoice bills what left and moves no stock again', async () => {
      const before = await onHand(bricks.id);

      const challan = await post('dispatches', fx.tokenA, {
        siteId: siteA.id,
        customerPartyId: customer.id,
        dispatchDate: '2026-09-14',
        lines: [{ itemId: bricks.id, warehouseId: yardA.id, quantity: '2000' }],
      }).expect(201);
      await patch(`dispatches/${challan.body.data.id}/confirm`, fx.tokenA, {}).expect(200);
      expect(await onHand(bricks.id)).toBe(before - 2000);

      const invoice = await post('sales/invoices', fx.tokenA, {
        customerPartyId: customer.id,
        siteId: siteA.id,
        dispatchId: challan.body.data.id,
        invoiceDate: '2026-09-14',
        lines: [
          {
            itemId: bricks.id,
            warehouseId: yardA.id,
            quantity: '2000',
            rate: '7',
            cgstRate: '6',
            sgstRate: '6',
            igstRate: '0',
          },
        ],
      }).expect(201);

      expect(invoice.body.data.dispatchId).toBe(challan.body.data.id);
      // The invoice billed it; the challan had already moved it.
      expect(await onHand(bricks.id)).toBe(before - 2000);
    });

    it('refuses to bill one challan twice', async () => {
      const challan = await post('dispatches', fx.tokenA, {
        siteId: siteA.id,
        customerPartyId: customer.id,
        dispatchDate: '2026-09-15',
        lines: [{ itemId: bricks.id, warehouseId: yardA.id, quantity: '800' }],
      }).expect(201);
      await patch(`dispatches/${challan.body.data.id}/confirm`, fx.tokenA, {}).expect(200);

      const body = {
        customerPartyId: customer.id,
        siteId: siteA.id,
        dispatchId: challan.body.data.id,
        invoiceDate: '2026-09-15',
        lines: [
          {
            itemId: bricks.id,
            warehouseId: yardA.id,
            quantity: '800',
            rate: '7',
            cgstRate: '6',
            sgstRate: '6',
            igstRate: '0',
          },
        ],
      };
      await post('sales/invoices', fx.tokenA, body).expect(201);
      const second = await post('sales/invoices', fx.tokenA, body).expect(422);
      expect(second.body.error.code).toBe('DISPATCH_ALREADY_BILLED');
    });

    it('refuses to bill more than the truck carried', async () => {
      const challan = await post('dispatches', fx.tokenA, {
        siteId: siteA.id,
        customerPartyId: customer.id,
        dispatchDate: '2026-09-16',
        lines: [{ itemId: bricks.id, warehouseId: yardA.id, quantity: '600' }],
      }).expect(201);
      await patch(`dispatches/${challan.body.data.id}/confirm`, fx.tokenA, {}).expect(200);

      const res = await post('sales/invoices', fx.tokenA, {
        customerPartyId: customer.id,
        siteId: siteA.id,
        dispatchId: challan.body.data.id,
        invoiceDate: '2026-09-16',
        lines: [
          {
            itemId: bricks.id,
            warehouseId: yardA.id,
            quantity: '900',
            rate: '7',
            cgstRate: '6',
            sgstRate: '6',
            igstRate: '0',
          },
        ],
      }).expect(422);
      expect(res.body.error.code).toBe('INVOICE_EXCEEDS_CHALLAN');
    });

    it('refuses to bill a grade that never left on that challan', async () => {
      const challan = await post('dispatches', fx.tokenA, {
        siteId: siteA.id,
        customerPartyId: customer.id,
        dispatchDate: '2026-09-17',
        lines: [{ itemId: bricks.id, warehouseId: yardA.id, quantity: '400' }],
      }).expect(201);
      await patch(`dispatches/${challan.body.data.id}/confirm`, fx.tokenA, {}).expect(200);

      const res = await post('sales/invoices', fx.tokenA, {
        customerPartyId: customer.id,
        siteId: siteA.id,
        dispatchId: challan.body.data.id,
        invoiceDate: '2026-09-17',
        lines: [
          {
            itemId: seconds.id,
            warehouseId: yardA.id,
            quantity: '400',
            rate: '5',
            cgstRate: '6',
            sgstRate: '6',
            igstRate: '0',
          },
        ],
      }).expect(422);
      expect(res.body.error.code).toBe('LINE_NOT_ON_CHALLAN');
    });
  });

  describe('cancelling', () => {
    it('cancels a draft with a reason', async () => {
      const created = await post('dispatches', fx.tokenA, {
        siteId: siteA.id,
        customerPartyId: customer.id,
        dispatchDate: '2026-09-18',
        lines: [{ itemId: bricks.id, warehouseId: yardA.id, quantity: '100' }],
      }).expect(201);

      const res = await patch(`dispatches/${created.body.data.id}/cancel`, fx.tokenA, {
        reason: 'Customer postponed the delivery',
      }).expect(200);
      expect(res.body.data.status).toBe('cancelled');
    });

    it('refuses to cancel a challan that already left the gate', async () => {
      const created = await post('dispatches', fx.tokenA, {
        siteId: siteA.id,
        customerPartyId: customer.id,
        dispatchDate: '2026-09-18',
        lines: [{ itemId: bricks.id, warehouseId: yardA.id, quantity: '100' }],
      }).expect(201);
      await patch(`dispatches/${created.body.data.id}/confirm`, fx.tokenA, {}).expect(200);

      const res = await patch(`dispatches/${created.body.data.id}/cancel`, fx.tokenA, {
        reason: 'Changed my mind about this one',
      }).expect(422);
      expect(res.body.error.code).toBe('DISPATCH_NOT_DRAFT');
    });
  });

  describe('DSP-05 challan PDF', () => {
    it('renders a PDF for the driver to carry', async () => {
      const created = await post('dispatches', fx.tokenA, {
        siteId: siteA.id,
        customerPartyId: customer.id,
        vehicleId: truck.id,
        driverId: driver.id,
        dispatchDate: '2026-09-19',
        lines: [{ itemId: bricks.id, warehouseId: yardA.id, quantity: '750' }],
      }).expect(201);

      const res = await request(fx.app.getHttpServer())
        .get(`/api/v1/dispatches/${created.body.data.id}/pdf`)
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);

      const pdf = res.body as Buffer;
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(pdf.length).toBeGreaterThan(1000);
      expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    });
  });

  describe('LEK-04 gate reconciliation', () => {
    it('lists a truck that left without a bill', async () => {
      const challan = await post('dispatches', fx.tokenA, {
        siteId: siteA.id,
        customerPartyId: customer.id,
        vehicleId: truck.id,
        dispatchDate: '2026-10-01',
        lines: [{ itemId: bricks.id, warehouseId: yardA.id, quantity: '1200' }],
      }).expect(201);
      await patch(`dispatches/${challan.body.data.id}/confirm`, fx.tokenA, {}).expect(200);

      const res = await get('dispatches/gate-reconciliation', fx.tokenA, {
        fromDate: '2026-10-01',
        toDate: '2026-10-01',
      }).expect(200);

      const rows = res.body.data as GateRow[];
      const row = rows.find((r) => r.challanNo === challan.body.data.challanNo);
      expect(row).toBeDefined();
      expect(row!.unbilled).toBe(true);
      expect(row!.invoiceNo).toBeNull();
      expect(row!.dispatchedQuantity).toBe('1200.000');
      expect(row!.stockMovedBy).toBe('dispatch');
      expect(res.body.meta.unbilledCount).toBe(1);
      expect(res.body.meta.unbilledQuantity).toBe('1200.000');
    });

    it('stops listing it once the bill is raised', async () => {
      const challan = await post('dispatches', fx.tokenA, {
        siteId: siteA.id,
        customerPartyId: customer.id,
        dispatchDate: '2026-10-02',
        lines: [{ itemId: bricks.id, warehouseId: yardA.id, quantity: '900' }],
      }).expect(201);
      await patch(`dispatches/${challan.body.data.id}/confirm`, fx.tokenA, {}).expect(200);

      await post('sales/invoices', fx.tokenA, {
        customerPartyId: customer.id,
        siteId: siteA.id,
        dispatchId: challan.body.data.id,
        invoiceDate: '2026-10-02',
        lines: [
          {
            itemId: bricks.id,
            warehouseId: yardA.id,
            quantity: '900',
            rate: '7',
            cgstRate: '6',
            sgstRate: '6',
            igstRate: '0',
          },
        ],
      }).expect(201);

      const res = await get('dispatches/gate-reconciliation', fx.tokenA, {
        fromDate: '2026-10-02',
        toDate: '2026-10-02',
      }).expect(200);

      const rows = res.body.data as GateRow[];
      const row = rows.find((r) => r.challanNo === challan.body.data.challanNo);
      expect(row).toBeDefined();
      expect(row!.unbilled).toBe(false);
      // Invoice numbers come from the voucher sequence, e.g. SAL/2026-27/000004.
      expect(row!.invoiceNo).toMatch(/^SAL\//);
      expect(row!.quantityMismatch).toBe(false);
      expect(res.body.meta.unbilledCount).toBe(0);
    });

    it('flags a part-billed challan as a quantity mismatch', async () => {
      const challan = await post('dispatches', fx.tokenA, {
        siteId: siteA.id,
        customerPartyId: customer.id,
        dispatchDate: '2026-10-03',
        lines: [{ itemId: bricks.id, warehouseId: yardA.id, quantity: '1000' }],
      }).expect(201);
      await patch(`dispatches/${challan.body.data.id}/confirm`, fx.tokenA, {}).expect(200);

      await post('sales/invoices', fx.tokenA, {
        customerPartyId: customer.id,
        siteId: siteA.id,
        dispatchId: challan.body.data.id,
        invoiceDate: '2026-10-03',
        lines: [
          {
            itemId: bricks.id,
            warehouseId: yardA.id,
            quantity: '700',
            rate: '7',
            cgstRate: '6',
            sgstRate: '6',
            igstRate: '0',
          },
        ],
      }).expect(201);

      const res = await get('dispatches/gate-reconciliation', fx.tokenA, {
        fromDate: '2026-10-03',
        toDate: '2026-10-03',
      }).expect(200);

      const rows = res.body.data as GateRow[];
      const row = rows.find((r) => r.challanNo === challan.body.data.challanNo);
      expect(row).toBeDefined();
      expect(row!.dispatchedQuantity).toBe('1000.000');
      expect(row!.invoicedQuantity).toBe('700.000');
      expect(row!.quantityMismatch).toBe(true);
      expect(res.body.meta.mismatchCount).toBe(1);
    });

    it('never counts a draft — nothing left the gate', async () => {
      await post('dispatches', fx.tokenA, {
        siteId: siteA.id,
        customerPartyId: customer.id,
        dispatchDate: '2026-10-04',
        lines: [{ itemId: bricks.id, warehouseId: yardA.id, quantity: '5000' }],
      }).expect(201);

      const res = await get('dispatches/gate-reconciliation', fx.tokenA, {
        fromDate: '2026-10-04',
        toDate: '2026-10-04',
      }).expect(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('refuses a window that ends before it starts', async () => {
      const res = await get('dispatches/gate-reconciliation', fx.tokenA, {
        fromDate: '2026-10-04',
        toDate: '2026-10-01',
      }).expect(422);
      expect(res.body.error.code).toBe('DATE_RANGE_INVALID');
    });
  });

  describe('tenancy and permissions', () => {
    it('never shows another company a challan', async () => {
      const created = await post('dispatches', fx.tokenA, {
        siteId: siteA.id,
        customerPartyId: customer.id,
        dispatchDate: '2026-10-05',
        lines: [{ itemId: bricks.id, warehouseId: yardA.id, quantity: '100' }],
      }).expect(201);

      const res = await get(`dispatches/${created.body.data.id}`, fx.tokenB).expect(422);
      expect(res.body.error.code).toBe('DISPATCH_NOT_FOUND');
    });

    it('refuses an unauthenticated caller', async () => {
      await request(fx.app.getHttpServer()).get('/api/v1/dispatches').expect(401);
    });
  });
});
