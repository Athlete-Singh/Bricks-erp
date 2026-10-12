import request from 'supertest';
import { DataSource } from 'typeorm';
import { Site } from '../src/modules/company/entities/site.entity';
import { Warehouse } from '../src/modules/inventory/entities/warehouse.entity';
import { Unit } from '../src/modules/inventory/entities/unit.entity';
import { Item } from '../src/modules/inventory/entities/item.entity';
import { Party } from '../src/modules/parties/entities/party.entity';
import { Vehicle } from '../src/modules/transport/entities/vehicle.entity';
import { Driver } from '../src/modules/transport/entities/driver.entity';
import { VehicleType, VehicleOwnerType } from '@brics/shared';
import { FinancialYear } from '../src/modules/company/entities/financial-year.entity';
import { seedChartForCompany } from '../src/accounting/chart-of-accounts.seed';
import { PartyService } from '../src/modules/parties/party.service';
import { StockService } from '../src/stock/stock.service';
import { createTenantFixture, type TenantFixture } from './helpers/tenant-fixture';

jest.setTimeout(60000);

/**
 * P9.1b — VEH-02…07, against real Postgres.
 *
 * Two invariants carry this module: freight income is booked once (ADR-042),
 * and fuel is paid for once (ADR-043). The rest is guard rails.
 */
describe('Transport operations (e2e)', () => {
  let fx: TenantFixture;
  let ds: DataSource;
  let siteA: Site;
  let tankYard: Warehouse;
  let brickYard: Warehouse;
  let diesel: Item;
  let bricks: Item;
  let customer: Party;
  let transporter: Party;
  let ownTruck: Vehicle;
  let hiredTruck: Vehicle;
  let driver: Driver;
  let cashLedgerId: string;

  const SYSTEM_USER = '00000000-0000-4000-8000-0000000000aa';

  const post = (path: string, token: string, body: Record<string, unknown>) =>
    request(fx.app.getHttpServer())
      .post(`/api/v1/${path}`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const patch = (path: string, token: string, body: Record<string, unknown>) =>
    request(fx.app.getHttpServer())
      .patch(`/api/v1/${path}`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const get = (path: string, token: string, query: Record<string, string> = {}) =>
    request(fx.app.getHttpServer())
      .get(`/api/v1/${path}`)
      .query(query)
      .set('Authorization', `Bearer ${token}`);

  /** What the books say a ledger holds, read straight from the voucher lines. */
  const ledgerBalance = async (code: string): Promise<number> => {
    const rows = await ds.query<{ bal: string | null }[]>(
      `SELECT COALESCE(SUM(vl."debit") - SUM(vl."credit"), 0) AS bal
         FROM voucher_lines vl
         JOIN ledgers l ON l.id = vl.ledger_id
        WHERE l.company_id = $1 AND l.code = $2 AND vl.deleted_at IS NULL`,
      [fx.companyA.id, code],
    );
    return Number(rows[0]?.bal ?? 0);
  };

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
      prefix: 'Transport Ops Test',
      domain: 'transport-ops.test',
      tables: [
        'vehicle_expenses',
        'vehicle_trips',
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
      mobilePrefix: '910000012',
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
    const mkYard = (name: string) =>
      ds
        .getRepository(Warehouse)
        .save(ds.getRepository(Warehouse).create({ companyId: fx.companyA.id, siteId: siteA.id, name }));
    tankYard = await mkYard('Fuel Store');
    brickYard = await mkYard('Finished Yard');

    const litres = await ds
      .getRepository(Unit)
      .save(ds.getRepository(Unit).create({ companyId: fx.companyA.id, name: 'Litres', abbreviation: 'L' }));
    diesel = await ds.getRepository(Item).save(
      ds
        .getRepository(Item)
        .create({ companyId: fx.companyA.id, name: 'Diesel', category: 'raw_material', unitId: litres.id }),
    );
    bricks = await ds.getRepository(Item).save(
      ds
        .getRepository(Item)
        .create({ companyId: fx.companyA.id, name: 'Class 1 Brick', category: 'other', unitId: litres.id }),
    );

    const mkVehicle = (registrationNo: string, ownerType: VehicleOwnerType) =>
      ds.getRepository(Vehicle).save(
        ds.getRepository(Vehicle).create({
          companyId: fx.companyA.id,
          registrationNo,
          type: VehicleType.TRUCK,
          ownerType,
          partyId: null,
          isActive: true,
        }),
      );
    ownTruck = await mkVehicle('UP32 AB 1234', VehicleOwnerType.OWN);
    hiredTruck = await mkVehicle('UP32 CD 5678', VehicleOwnerType.HIRED);
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
    transporter = await partyService.create(fx.companyA.id, SYSTEM_USER, {
      name: 'Yadav Transport Co',
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

    // Fill the fuel store and the brick yard.
    const stock = fx.app.get(StockService);
    await ds.transaction(async (manager) => {
      await stock.record(manager, {
        companyId: fx.companyA.id,
        userId: SYSTEM_USER,
        warehouseId: tankYard.id,
        itemId: diesel.id,
        movementType: 'opening',
        direction: 'in',
        quantity: '2000.000',
        movementDate: '2026-08-01',
        sourceType: 'opening_balance',
        sourceId: null,
        notes: 'Opening fuel',
      });
      await stock.record(manager, {
        companyId: fx.companyA.id,
        userId: SYSTEM_USER,
        warehouseId: brickYard.id,
        itemId: bricks.id,
        movementType: 'opening',
        direction: 'in',
        quantity: '100000.000',
        movementDate: '2026-08-01',
        sourceType: 'opening_balance',
        sourceId: null,
        notes: 'Opening stock',
      });
    });
  });

  afterAll(async () => {
    await fx.close();
  });

  // ──────────────────────────────────────────────────────────────────────────

  describe('VEH-02 trip log', () => {
    it('logs a trip with no freight and posts no journal', async () => {
      const res = await post('transport/trips', fx.tokenA, {
        vehicleId: ownTruck.id,
        driverId: driver.id,
        siteId: siteA.id,
        tripDate: '2026-09-01',
        routeFrom: 'Kiln',
        routeTo: 'Ring Road',
        distanceKm: '42',
      }).expect(201);

      expect(res.body.data.tripNo).toMatch(/^TRP-\d{5}$/);
      expect(res.body.data.freightAmount).toBeNull();
      expect(res.body.data.voucherId).toBeNull();
    });

    it('charges freight: Dr customer, Cr Freight Income', async () => {
      const before = await ledgerBalance('FREIGHT_INCOME');

      const res = await post('transport/trips', fx.tokenA, {
        vehicleId: ownTruck.id,
        siteId: siteA.id,
        tripDate: '2026-09-02',
        freightAmount: '4500',
        freightPartyId: customer.id,
      }).expect(201);

      expect(res.body.data.voucherId).not.toBeNull();
      // Income is a credit, so the Dr − Cr balance moves down by the amount.
      expect(await ledgerBalance('FREIGHT_INCOME')).toBe(before - 4500);
    });

    it('refuses freight with nobody to charge it to', async () => {
      await post('transport/trips', fx.tokenA, {
        vehicleId: ownTruck.id,
        siteId: siteA.id,
        tripDate: '2026-09-02',
        freightAmount: '4500',
      }).expect(400);
    });

    it('refuses a future-dated trip (ADR-028)', async () => {
      const res = await post('transport/trips', fx.tokenA, {
        vehicleId: ownTruck.id,
        siteId: siteA.id,
        tripDate: '2099-01-01',
      }).expect(422);
      expect(res.body.error.code).toBe('TRANSPORT_DATE_IN_FUTURE');
    });

    it('refuses a vehicle belonging to another company (ADR-021)', async () => {
      const res = await post('transport/trips', fx.tokenB, {
        vehicleId: ownTruck.id,
        siteId: siteA.id,
        tripDate: '2026-09-02',
      }).expect(422);
      expect(res.body.error.code).toBe('VEHICLE_NOT_FOUND');
    });
  });

  describe('ADR-042 — freight is income exactly once', () => {
    it('refuses trip freight when the load was already billed transport on its invoice', async () => {
      const challan = await post('dispatches', fx.tokenA, {
        siteId: siteA.id,
        customerPartyId: customer.id,
        dispatchDate: '2026-09-04',
        lines: [{ itemId: bricks.id, warehouseId: brickYard.id, quantity: '1000' }],
      }).expect(201);
      await patch(`dispatches/${challan.body.data.id}/confirm`, fx.tokenA, {}).expect(200);

      // The invoice carries a transport charge — that is the freight income.
      await post('sales/invoices', fx.tokenA, {
        customerPartyId: customer.id,
        siteId: siteA.id,
        dispatchId: challan.body.data.id,
        invoiceDate: '2026-09-04',
        lines: [
          {
            itemId: bricks.id,
            warehouseId: brickYard.id,
            quantity: '1000',
            rate: '7',
            cgstRate: '6',
            sgstRate: '6',
            igstRate: '0',
          },
        ],
        charges: [
          { kind: 'transport', label: 'Delivery to site', amount: '3000', cgstRate: '6', sgstRate: '6', igstRate: '0' },
        ],
      }).expect(201);

      const res = await post('transport/trips', fx.tokenA, {
        vehicleId: ownTruck.id,
        siteId: siteA.id,
        dispatchId: challan.body.data.id,
        tripDate: '2026-09-04',
        freightAmount: '3000',
        freightPartyId: customer.id,
      }).expect(422);
      expect(res.body.error.code).toBe('FREIGHT_ALREADY_BILLED');
    });

    it('allows trip freight when the invoice charged no transport', async () => {
      const challan = await post('dispatches', fx.tokenA, {
        siteId: siteA.id,
        customerPartyId: customer.id,
        dispatchDate: '2026-09-05',
        lines: [{ itemId: bricks.id, warehouseId: brickYard.id, quantity: '800' }],
      }).expect(201);
      await patch(`dispatches/${challan.body.data.id}/confirm`, fx.tokenA, {}).expect(200);

      await post('sales/invoices', fx.tokenA, {
        customerPartyId: customer.id,
        siteId: siteA.id,
        dispatchId: challan.body.data.id,
        invoiceDate: '2026-09-05',
        lines: [
          {
            itemId: bricks.id,
            warehouseId: brickYard.id,
            quantity: '800',
            rate: '7',
            cgstRate: '6',
            sgstRate: '6',
            igstRate: '0',
          },
        ],
      }).expect(201);

      const res = await post('transport/trips', fx.tokenA, {
        vehicleId: ownTruck.id,
        siteId: siteA.id,
        dispatchId: challan.body.data.id,
        tripDate: '2026-09-05',
        freightAmount: '2500',
        freightPartyId: customer.id,
      }).expect(201);
      expect(res.body.data.voucherId).not.toBeNull();
    });
  });

  describe('VEH-03…06 vehicle charges', () => {
    it('books diesel bought at a pump: Dr Vehicle Diesel, Cr Cash', async () => {
      const diesel0 = await ledgerBalance('VEHICLE_DIESEL');
      const cash0 = await ledgerBalance('CASH');

      const res = await post('transport/expenses', fx.tokenA, {
        vehicleId: ownTruck.id,
        siteId: siteA.id,
        kind: 'diesel',
        expenseDate: '2026-09-06',
        amount: '4000',
        quantity: '40',
        paidFromLedgerId: cashLedgerId,
        reference: 'Pump slip 112',
      }).expect(201);

      expect(res.body.data.voucherId).not.toBeNull();
      expect(res.body.data.stockMovementId).toBeNull();
      expect(await ledgerBalance('VEHICLE_DIESEL')).toBe(diesel0 + 4000);
      expect(await ledgerBalance('CASH')).toBe(cash0 - 4000);
    });

    it('books maintenance to Vehicle Repairs', async () => {
      const before = await ledgerBalance('VEHICLE_REPAIRS');
      await post('transport/expenses', fx.tokenA, {
        vehicleId: ownTruck.id,
        siteId: siteA.id,
        kind: 'maintenance',
        expenseDate: '2026-09-07',
        amount: '1800',
        paidFromLedgerId: cashLedgerId,
      }).expect(201);
      expect(await ledgerBalance('VEHICLE_REPAIRS')).toBe(before + 1800);
    });

    it('books loading fees to Loading & Unloading', async () => {
      const before = await ledgerBalance('LOADING_UNLOADING');
      await post('transport/expenses', fx.tokenA, {
        vehicleId: ownTruck.id,
        siteId: siteA.id,
        kind: 'loading',
        expenseDate: '2026-09-07',
        amount: '600',
        paidFromLedgerId: cashLedgerId,
      }).expect(201);
      expect(await ledgerBalance('LOADING_UNLOADING')).toBe(before + 600);
    });

    it('VEH-06 — a hired vehicle on credit becomes payable to the transporter', async () => {
      const expense0 = await ledgerBalance('FREIGHT_EXPENSE');
      const cash0 = await ledgerBalance('CASH');

      const res = await post('transport/expenses', fx.tokenA, {
        vehicleId: hiredTruck.id,
        siteId: siteA.id,
        kind: 'hire',
        expenseDate: '2026-09-08',
        amount: '9000',
        partyId: transporter.id,
      }).expect(201);

      expect(res.body.data.paidFromLedgerId).toBeNull();
      expect(await ledgerBalance('FREIGHT_EXPENSE')).toBe(expense0 + 9000);
      // Owed, not paid — the cash book must not move.
      expect(await ledgerBalance('CASH')).toBe(cash0);

      const payable = await ds.query<{ bal: string }[]>(
        `SELECT COALESCE(SUM(vl."credit") - SUM(vl."debit"), 0) AS bal
           FROM voucher_lines vl WHERE vl.party_id = $1 AND vl.deleted_at IS NULL`,
        [transporter.id],
      );
      expect(Number(payable[0]!.bal)).toBe(9000);
    });

    it('refuses a charge that is both paid and owed', async () => {
      await post('transport/expenses', fx.tokenA, {
        vehicleId: ownTruck.id,
        siteId: siteA.id,
        kind: 'maintenance',
        expenseDate: '2026-09-08',
        amount: '500',
        paidFromLedgerId: cashLedgerId,
        partyId: transporter.id,
      }).expect(400);
    });

    it('refuses a charge that is neither paid nor owed', async () => {
      await post('transport/expenses', fx.tokenA, {
        vehicleId: ownTruck.id,
        siteId: siteA.id,
        kind: 'maintenance',
        expenseDate: '2026-09-08',
        amount: '500',
      }).expect(400);
    });

    it('refuses a trip run by a different vehicle', async () => {
      const trip = await post('transport/trips', fx.tokenA, {
        vehicleId: ownTruck.id,
        siteId: siteA.id,
        tripDate: '2026-09-08',
      }).expect(201);

      const res = await post('transport/expenses', fx.tokenA, {
        vehicleId: hiredTruck.id,
        tripId: trip.body.data.id,
        siteId: siteA.id,
        kind: 'diesel',
        expenseDate: '2026-09-08',
        amount: '1000',
        quantity: '10',
        paidFromLedgerId: cashLedgerId,
      }).expect(422);
      expect(res.body.error.code).toBe('TRIP_VEHICLE_MISMATCH');
    });
  });

  describe('ADR-043 — fuel from the kiln tank moves stock and posts no journal', () => {
    it('issues diesel from the fuel store without touching the ledger', async () => {
      const fuel0 = await onHand(diesel.id);
      const ledger0 = await ledgerBalance('VEHICLE_DIESEL');
      const cash0 = await ledgerBalance('CASH');

      const res = await post('transport/expenses', fx.tokenA, {
        vehicleId: ownTruck.id,
        siteId: siteA.id,
        kind: 'diesel',
        expenseDate: '2026-09-09',
        amount: '3000',
        quantity: '30',
        itemId: diesel.id,
        warehouseId: tankYard.id,
      }).expect(201);

      expect(res.body.data.stockMovementId).not.toBeNull();
      expect(res.body.data.voucherId).toBeNull();
      expect(await onHand(diesel.id)).toBe(fuel0 - 30);
      // That fuel was expensed on its purchase bill — booking it again here
      // would charge the kiln twice for one tankful.
      expect(await ledgerBalance('VEHICLE_DIESEL')).toBe(ledger0);
      expect(await ledgerBalance('CASH')).toBe(cash0);
    });

    it('refuses a tank issue that also names a payment', async () => {
      await post('transport/expenses', fx.tokenA, {
        vehicleId: ownTruck.id,
        siteId: siteA.id,
        kind: 'diesel',
        expenseDate: '2026-09-09',
        amount: '3000',
        quantity: '30',
        itemId: diesel.id,
        warehouseId: tankYard.id,
        paidFromLedgerId: cashLedgerId,
      }).expect(400);
    });

    it('refuses drawing anything but diesel from a yard', async () => {
      await post('transport/expenses', fx.tokenA, {
        vehicleId: ownTruck.id,
        siteId: siteA.id,
        kind: 'maintenance',
        expenseDate: '2026-09-09',
        amount: '500',
        quantity: '5',
        itemId: diesel.id,
        warehouseId: tankYard.id,
      }).expect(400);
    });

    it('rolls back entirely when the tank cannot cover the issue (ADR-026)', async () => {
      const fuel0 = await onHand(diesel.id);

      await post('transport/expenses', fx.tokenA, {
        vehicleId: ownTruck.id,
        siteId: siteA.id,
        kind: 'diesel',
        expenseDate: '2026-09-09',
        amount: '900000',
        quantity: '999999',
        itemId: diesel.id,
        warehouseId: tankYard.id,
      }).expect(422);

      expect(await onHand(diesel.id)).toBe(fuel0);
      const rows = await ds.query<{ count: string }[]>(
        `SELECT count(*) AS count FROM vehicle_expenses WHERE company_id = $1 AND amount = 900000`,
        [fx.companyA.id],
      );
      expect(Number(rows[0]!.count)).toBe(0);
    });
  });

  describe('VEH-07 vehicle profitability', () => {
    it('reports freight earned less what the vehicle cost', async () => {
      const res = await get('transport/vehicle-profitability', fx.tokenA, {
        fromDate: '2026-09-01',
        toDate: '2026-09-30',
      }).expect(200);

      const rows = res.body.data as {
        registrationNo: string;
        freightIncome: string;
        diesel: string;
        maintenance: string;
        loading: string;
        hire: string;
        totalCost: string;
        net: string;
        costPerKm: string | null;
      }[];

      const own = rows.find((r) => r.registrationNo === 'UP32 AB 1234');
      expect(own).toBeDefined();
      // 4500 + 2500 charged as freight on the two trips that carried it.
      expect(own!.freightIncome).toBe('7000.00');
      // 4000 at the pump + 3000 out of the tank.
      expect(own!.diesel).toBe('7000.00');
      expect(own!.maintenance).toBe('1800.00');
      expect(own!.loading).toBe('600.00');
      expect(own!.totalCost).toBe('9400.00');
      expect(own!.net).toBe('-2400.00');

      const hired = rows.find((r) => r.registrationNo === 'UP32 CD 5678');
      expect(hired!.hire).toBe('9000.00');
      expect(hired!.net).toBe('-9000.00');
    });

    it('narrows to one vehicle when asked', async () => {
      const res = await get('transport/vehicle-profitability', fx.tokenA, {
        fromDate: '2026-09-01',
        toDate: '2026-09-30',
        vehicleId: hiredTruck.id,
      }).expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.vehicleCount).toBe(1);
    });

    it('counts nothing outside the window', async () => {
      const res = await get('transport/vehicle-profitability', fx.tokenA, {
        fromDate: '2026-11-01',
        toDate: '2026-11-30',
      }).expect(200);
      expect(res.body.meta.freightIncome).toBe('0.00');
      expect(res.body.meta.totalCost).toBe('0.00');
    });

    it('refuses a window that ends before it starts', async () => {
      const res = await get('transport/vehicle-profitability', fx.tokenA, {
        fromDate: '2026-09-30',
        toDate: '2026-09-01',
      }).expect(422);
      expect(res.body.error.code).toBe('DATE_RANGE_INVALID');
    });

    it('never shows another company a vehicle', async () => {
      const res = await get('transport/vehicle-profitability', fx.tokenB, {
        fromDate: '2026-09-01',
        toDate: '2026-09-30',
      }).expect(200);
      expect(res.body.data).toHaveLength(0);
    });
  });

  describe('tenancy and permissions', () => {
    it('refuses an unauthenticated caller', async () => {
      await request(fx.app.getHttpServer()).get('/api/v1/transport/trips').expect(401);
    });

    it('never shows another company a trip', async () => {
      const trip = await post('transport/trips', fx.tokenA, {
        vehicleId: ownTruck.id,
        siteId: siteA.id,
        tripDate: '2026-09-10',
      }).expect(201);

      const res = await get(`transport/trips/${trip.body.data.id}`, fx.tokenB).expect(422);
      expect(res.body.error.code).toBe('TRIP_NOT_FOUND');
    });
  });
});
