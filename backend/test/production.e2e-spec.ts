import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { seedChartForCompany } from '../src/accounting/chart-of-accounts.seed';
import { Role } from '../src/modules/auth/entities/role.entity';
import { User } from '../src/modules/auth/entities/user.entity';
import { UserCompany } from '../src/modules/auth/entities/user-company.entity';
import { FinancialYear } from '../src/modules/company/entities/financial-year.entity';
import { Site } from '../src/modules/company/entities/site.entity';
import { Warehouse } from '../src/modules/inventory/entities/warehouse.entity';
import { BrickType } from '../src/modules/inventory/entities/brick-type.entity';
import { Item } from '../src/modules/inventory/entities/item.entity';
import { Unit } from '../src/modules/inventory/entities/unit.entity';
import { Party } from '../src/modules/parties/entities/party.entity';
import { PartyService } from '../src/modules/parties/party.service';
import { StockService } from '../src/stock/stock.service';
import { ProductionConsumption } from '../src/modules/production/entities/production-consumption.entity';
import { createTenantFixture, type TenantFixture } from './helpers/tenant-fixture';

jest.setTimeout(60000);

/**
 * PRD-02…05, LEK-01 — production batches and the yield variance report,
 * against real Postgres.
 *
 * The e2e tests cover what the unit level cannot: sorting + stock in one
 * transaction, cross-tenant refusal, permission split, DB CHECKs holding, and
 * the LEK-01 arithmetic end to end.
 */
describe('Production (e2e)', () => {
  let fx: TenantFixture;
  let siteA: Site;
  let siteB: Site;
  let warehouseA: Warehouse;
  let rawYardA: Warehouse;
  let classOne: BrickType;
  let classTwo: BrickType;
  let gradeB: BrickType;
  let sardarA: Party;
  let coal: Item;
  let soil: Item;
  let consumable: Item;
  let coalB: Item;

  const BATCH_DATE = '2026-10-01';
  const MAKING_DATE = '2026-10-01';
  const SORTING_DATE = '2026-10-05';

  const postJson = (method: 'post' | 'get', url: string, token: string) =>
    request(fx.app.getHttpServer())[method](url).set('Authorization', `Bearer ${token}`);

  const createBatch = (token: string, body: Record<string, unknown>) =>
    postJson('post', '/api/v1/production/batches', token).send(body);
  const making = (token: string, id: string, body: Record<string, unknown>) =>
    postJson('post', `/api/v1/production/batches/${id}/making`, token).send(body);
  const drying = (token: string, id: string, body: Record<string, unknown>) =>
    postJson('post', `/api/v1/production/batches/${id}/drying`, token).send(body);
  const firing = (token: string, id: string, body: Record<string, unknown>) =>
    postJson('post', `/api/v1/production/batches/${id}/firing`, token).send(body);
  const sorting = (token: string, id: string, body: Record<string, unknown>) =>
    postJson('post', `/api/v1/production/batches/${id}/sorting`, token).send(body);

  beforeAll(async () => {
    fx = await createTenantFixture({
      prefix: 'Production Test',
      domain: 'production.test',
      // Children before parents; ledgers/voucher-sequences/voucher-types/ledger-groups
      // let us delete parties cleanly between runs.
      tables: [
        'production_consumptions',
        'production_sorting_outputs',
        'production_entries',
        'production_batches',
        'stock_movements',
        'parties',
        'ledgers',
        'voucher_sequences',
        'voucher_types',
        'ledger_groups',
        'items',
        'units',
        'warehouses',
        'brick_types',
        'sites',
      ],
      mobilePrefix: '910000011',
    });

    const ds = fx.dataSource;

    // Parties auto-create a ledger (ADR-020), which needs a chart of accounts
    // and an active FY on the company.
    await ds.transaction((manager) => seedChartForCompany(manager, fx.companyA.id));
    const fyRepo = ds.getRepository(FinancialYear);
    await fyRepo.save(
      fyRepo.create({
        companyId: fx.companyA.id,
        name: '2026-27',
        startDate: '2026-04-01',
        endDate: '2027-03-31',
        isActive: true,
        isLocked: false,
      }),
    );
    siteA = await ds
      .getRepository(Site)
      .save(ds.getRepository(Site).create({ companyId: fx.companyA.id, name: 'Kiln A', code: 'KA' }));
    siteB = await ds
      .getRepository(Site)
      .save(ds.getRepository(Site).create({ companyId: fx.companyB.id, name: 'Kiln B', code: 'KB' }));

    warehouseA = await ds
      .getRepository(Warehouse)
      .save(ds.getRepository(Warehouse).create({ companyId: fx.companyA.id, siteId: siteA.id, name: 'Finished Yard' }));
    rawYardA = await ds
      .getRepository(Warehouse)
      .save(ds.getRepository(Warehouse).create({ companyId: fx.companyA.id, siteId: siteA.id, name: 'Raw Yard' }));
    // Company B needs at least one warehouse so its fixtures look like company A's.
    await ds
      .getRepository(Warehouse)
      .save(ds.getRepository(Warehouse).create({ companyId: fx.companyB.id, siteId: siteB.id, name: 'Other Yard' }));

    const unitKg = await ds
      .getRepository(Unit)
      .save(ds.getRepository(Unit).create({ companyId: fx.companyA.id, name: 'Kilogram', abbreviation: 'kg' }));
    const unitKgB = await ds
      .getRepository(Unit)
      .save(ds.getRepository(Unit).create({ companyId: fx.companyB.id, name: 'Kilogram', abbreviation: 'kg' }));

    coal = await ds
      .getRepository(Item)
      .save(
        ds
          .getRepository(Item)
          .create({ companyId: fx.companyA.id, name: 'Coal', category: 'raw_material', unitId: unitKg.id }),
      );
    soil = await ds
      .getRepository(Item)
      .save(
        ds
          .getRepository(Item)
          .create({ companyId: fx.companyA.id, name: 'Soil', category: 'raw_material', unitId: unitKg.id }),
      );
    consumable = await ds
      .getRepository(Item)
      .save(
        ds
          .getRepository(Item)
          .create({ companyId: fx.companyA.id, name: 'Diesel', category: 'consumable', unitId: unitKg.id }),
      );
    coalB = await ds
      .getRepository(Item)
      .save(
        ds
          .getRepository(Item)
          .create({ companyId: fx.companyB.id, name: 'Coal', category: 'raw_material', unitId: unitKgB.id }),
      );

    classOne = await ds
      .getRepository(BrickType)
      .save(ds.getRepository(BrickType).create({ companyId: fx.companyA.id, grade: 'Class 1' }));
    classTwo = await ds
      .getRepository(BrickType)
      .save(ds.getRepository(BrickType).create({ companyId: fx.companyA.id, grade: 'Class 2' }));
    gradeB = await ds
      .getRepository(BrickType)
      .save(ds.getRepository(BrickType).create({ companyId: fx.companyB.id, grade: 'Grade B1' }));

    // Opening stock so the firing/making tests have raw material to draw down.
    // StockService refuses dates in the future, so the opening is dated well
    // before the batch dates.
    const stock = fx.app.get(StockService);
    for (const [item, qty] of [
      [coal, '10000'],
      [soil, '50000'],
      [consumable, '2000'],
    ] as const) {
      await stock.openingStock(fx.companyA.id, '00000000-0000-0000-0000-000000000000', {
        warehouseId: rawYardA.id,
        itemId: item.id,
        brickTypeId: null,
        quantity: qty,
        movementDate: '2026-09-01',
        notes: `Opening ${item.name}`,
      });
    }

    const partyService = fx.app.get(PartyService);
    sardarA = await partyService.create(fx.companyA.id, '00000000-0000-0000-0000-000000000000', {
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
  });

  afterAll(async () => {
    await fx.close();
  });

  // ------------------------------------------------------------------
  // Happy path end to end
  // ------------------------------------------------------------------

  describe('full stage flow', () => {
    let batchId: string;

    it('opens a batch for a kiln + chamber + date', async () => {
      const res = await createBatch(fx.tokenA, {
        siteId: siteA.id,
        chamber: 'C1',
        batchDate: BATCH_DATE,
      }).expect(201);
      expect(res.body.data.status).toBe('open');
      expect(res.body.data.chamber).toBe('C1');
      batchId = res.body.data.id as string;
    });

    it('refuses a second batch for the same chamber on the same day', async () => {
      const res = await createBatch(fx.tokenA, {
        siteId: siteA.id,
        chamber: 'C1',
        batchDate: BATCH_DATE,
      }).expect(422);
      expect(res.body.error.code).toBe('PRODUCTION_BATCH_DUPLICATE');
    });

    it('refuses sorting before making', async () => {
      const res = await sorting(fx.tokenA, batchId, {
        entryDate: SORTING_DATE,
        warehouseId: warehouseA.id,
        outputs: [{ brickTypeId: classOne.id, quantity: '100' }],
        brokenBricks: '0',
        rejectBricks: '0',
      }).expect(422);
      expect(res.body.error.code).toBe('PRODUCTION_STAGE_OUT_OF_ORDER');
    });

    it('records making with a Sardar', async () => {
      const res = await making(fx.tokenA, batchId, {
        entryDate: MAKING_DATE,
        greenBricks: '10000',
        sardarPartyId: sardarA.id,
      }).expect(201);
      expect(res.body.data.stage).toBe('making');
      expect(res.body.data.greenBricks).toBe('10000.000');
    });

    it('records drying', async () => {
      await drying(fx.tokenA, batchId, { entryDate: '2026-10-03' }).expect(201);
    });

    it('refuses a second making entry on the same batch', async () => {
      const res = await making(fx.tokenA, batchId, {
        entryDate: MAKING_DATE,
        greenBricks: '500',
      }).expect(422);
      expect(res.body.error.code).toBe('PRODUCTION_STAGE_DUPLICATE');
    });

    it('records firing and flips the batch to firing status', async () => {
      await firing(fx.tokenA, batchId, { entryDate: '2026-10-04', firedBricks: '9800' }).expect(201);
      const detail = await postJson('get', `/api/v1/production/batches/${batchId}`, fx.tokenA).expect(200);
      expect(detail.body.data.batch.status).toBe('firing');
    });

    it('refuses duplicate grades in one sorting entry', async () => {
      const res = await sorting(fx.tokenA, batchId, {
        entryDate: SORTING_DATE,
        warehouseId: warehouseA.id,
        outputs: [
          { brickTypeId: classOne.id, quantity: '100' },
          { brickTypeId: classOne.id, quantity: '200' },
        ],
        brokenBricks: '0',
        rejectBricks: '0',
      }).expect(422);
      expect(res.body.error.code).toBe('PRODUCTION_SORTING_DUPLICATE_GRADE');
    });

    it('refuses sorting that names another company’s grade', async () => {
      const res = await sorting(fx.tokenA, batchId, {
        entryDate: SORTING_DATE,
        warehouseId: warehouseA.id,
        outputs: [{ brickTypeId: gradeB.id, quantity: '100' }],
        brokenBricks: '0',
        rejectBricks: '0',
      }).expect(422);
      expect(res.body.error.code).toBe('BRICK_TYPE_NOT_FOUND');
    });

    it('sorts into stock in one transaction', async () => {
      const stock = fx.app.get(StockService);
      const beforeOne = await stock.currentBalance(fx.companyA.id, {
        warehouseId: warehouseA.id,
        brickTypeId: classOne.id,
      });
      const beforeTwo = await stock.currentBalance(fx.companyA.id, {
        warehouseId: warehouseA.id,
        brickTypeId: classTwo.id,
      });

      const res = await sorting(fx.tokenA, batchId, {
        entryDate: SORTING_DATE,
        warehouseId: warehouseA.id,
        outputs: [
          { brickTypeId: classOne.id, quantity: '7000' },
          { brickTypeId: classTwo.id, quantity: '2500' },
        ],
        brokenBricks: '200',
        rejectBricks: '100',
      }).expect(201);

      expect(res.body.data.entry.stage).toBe('sorting');
      expect(res.body.data.outputs).toHaveLength(2);

      const afterOne = await stock.currentBalance(fx.companyA.id, {
        warehouseId: warehouseA.id,
        brickTypeId: classOne.id,
      });
      const afterTwo = await stock.currentBalance(fx.companyA.id, {
        warehouseId: warehouseA.id,
        brickTypeId: classTwo.id,
      });
      expect(Number(afterOne) - Number(beforeOne)).toBe(7000);
      expect(Number(afterTwo) - Number(beforeTwo)).toBe(2500);
    });

    it('refuses sorting a second time (batch already sorted)', async () => {
      const res = await sorting(fx.tokenA, batchId, {
        entryDate: SORTING_DATE,
        warehouseId: warehouseA.id,
        outputs: [{ brickTypeId: classOne.id, quantity: '100' }],
        brokenBricks: '0',
        rejectBricks: '0',
      }).expect(422);
      expect(res.body.error.code).toBe('PRODUCTION_STAGE_DUPLICATE');
    });

    it('shows the batch sorted on fetch', async () => {
      const res = await postJson('get', `/api/v1/production/batches/${batchId}`, fx.tokenA).expect(200);
      expect(res.body.data.batch.status).toBe('sorted');
      expect(res.body.data.entries).toHaveLength(4);
      expect(res.body.data.outputs).toHaveLength(2);
    });
  });

  // ------------------------------------------------------------------
  // LEK-01 yield variance
  // ------------------------------------------------------------------

  describe('LEK-01 yield variance', () => {
    it('reports the unexplained column honestly', async () => {
      const res = await request(fx.app.getHttpServer())
        .get('/api/v1/production/yield-variance')
        .query({ from: '2026-09-01', to: '2026-10-31' })
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);

      // The flow above moulded 10,000 green, fired 9,800, and sorted into
      // 7,000 + 2,500 good, 200 broken, 100 rejects → unexplained 200.
      expect(res.body.data).toHaveLength(1);
      const row = res.body.data[0];
      expect(row.greenMoulded).toBe('10000.000');
      expect(row.fired).toBe('9800.000');
      expect(row.goodTotal).toBe('9500.000');
      expect(row.broken).toBe('200.000');
      expect(row.rejects).toBe('100.000');
      expect(row.unexplained).toBe('200.000');
    });

    it('groups by Sardar when asked', async () => {
      const res = await request(fx.app.getHttpServer())
        .get('/api/v1/production/yield-variance')
        .query({ from: '2026-09-01', to: '2026-10-31', groupBy: 'sardar' })
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].sardarPartyId).toBe(sardarA.id);
      expect(res.body.data[0].groupLabel).toBe('Ramesh Sardar');
    });
  });

  // ------------------------------------------------------------------
  // PRD-04 consumption + LEK-02 fuel variance
  // ------------------------------------------------------------------

  describe('PRD-04 raw material consumption', () => {
    let batchId: string;

    it('opens a second batch for the consumption flow', async () => {
      const res = await createBatch(fx.tokenA, {
        siteId: siteA.id,
        chamber: 'C2',
        batchDate: '2026-09-10',
      }).expect(201);
      batchId = res.body.data.id as string;
    });

    it('refuses consumption of a non-raw-material item', async () => {
      const res = await making(fx.tokenA, batchId, {
        entryDate: '2026-09-10',
        greenBricks: '10000',
        consumption: [{ itemId: consumable.id, warehouseId: rawYardA.id, quantity: '100' }],
      }).expect(422);
      expect(res.body.error.code).toBe('PRODUCTION_CONSUMPTION_ITEM_INVALID');

      // Rolled back — no making entry was created.
      const detail = await postJson('get', `/api/v1/production/batches/${batchId}`, fx.tokenA).expect(200);
      expect(detail.body.data.entries).toHaveLength(0);
    });

    it('refuses consumption of another company’s item (cross-tenant)', async () => {
      const res = await making(fx.tokenA, batchId, {
        entryDate: '2026-09-10',
        greenBricks: '10000',
        consumption: [{ itemId: coalB.id, warehouseId: rawYardA.id, quantity: '100' }],
      }).expect(422);
      expect(res.body.error.code).toBe('PRODUCTION_CONSUMPTION_ITEM_NOT_FOUND');
    });

    it('refuses the same item from the same warehouse twice in one stage', async () => {
      const res = await making(fx.tokenA, batchId, {
        entryDate: '2026-09-10',
        greenBricks: '10000',
        consumption: [
          { itemId: soil.id, warehouseId: rawYardA.id, quantity: '1000' },
          { itemId: soil.id, warehouseId: rawYardA.id, quantity: '500' },
        ],
      }).expect(422);
      expect(res.body.error.code).toBe('PRODUCTION_CONSUMPTION_DUPLICATE');
    });

    it('records soil consumption at making and reduces raw stock in one transaction', async () => {
      const stock = fx.app.get(StockService);
      const before = await stock.currentBalance(fx.companyA.id, {
        warehouseId: rawYardA.id,
        itemId: soil.id,
      });

      const res = await making(fx.tokenA, batchId, {
        entryDate: '2026-09-10',
        greenBricks: '10000',
        consumption: [{ itemId: soil.id, warehouseId: rawYardA.id, quantity: '1500' }],
      }).expect(201);
      expect(res.body.data.stage).toBe('making');

      const after = await stock.currentBalance(fx.companyA.id, {
        warehouseId: rawYardA.id,
        itemId: soil.id,
      });
      expect(Number(before) - Number(after)).toBe(1500);

      const detail = await postJson('get', `/api/v1/production/batches/${batchId}`, fx.tokenA).expect(200);
      expect(detail.body.data.consumptions).toHaveLength(1);
      expect(detail.body.data.consumptions[0].itemId).toBe(soil.id);
      expect(detail.body.data.consumptions[0].stockMovementId).toBeTruthy();
    });

    it('rolls firing back when coal would go below zero', async () => {
      const stock = fx.app.get(StockService);
      const beforeCoal = await stock.currentBalance(fx.companyA.id, {
        warehouseId: rawYardA.id,
        itemId: coal.id,
      });

      // 20,000 is more coal than we seeded — the OUT fails, which must take the
      // whole firing stage down with it.
      const res = await firing(fx.tokenA, batchId, {
        entryDate: '2026-09-11',
        firedBricks: '9800',
        consumption: [{ itemId: coal.id, warehouseId: rawYardA.id, quantity: '20000' }],
      }).expect(422);
      expect(res.body.error.code).toBe('STOCK_INSUFFICIENT');

      // Firing never happened: no entry row, no stock drawn down.
      const afterCoal = await stock.currentBalance(fx.companyA.id, {
        warehouseId: rawYardA.id,
        itemId: coal.id,
      });
      expect(afterCoal).toBe(beforeCoal);
      const detail = await postJson('get', `/api/v1/production/batches/${batchId}`, fx.tokenA).expect(200);
      const entries = detail.body.data.entries as Array<{ stage: string }>;
      expect(entries.find((e) => e.stage === 'firing')).toBeUndefined();
    });

    it('records firing with coal consumption and a consumption row', async () => {
      const stock = fx.app.get(StockService);
      const before = await stock.currentBalance(fx.companyA.id, {
        warehouseId: rawYardA.id,
        itemId: coal.id,
      });

      await firing(fx.tokenA, batchId, {
        entryDate: '2026-09-11',
        firedBricks: '9800',
        consumption: [{ itemId: coal.id, warehouseId: rawYardA.id, quantity: '1500' }],
      }).expect(201);

      const after = await stock.currentBalance(fx.companyA.id, {
        warehouseId: rawYardA.id,
        itemId: coal.id,
      });
      expect(Number(before) - Number(after)).toBe(1500);

      // One soil (making) + one coal (firing) now stand against this batch.
      const consumptions = await fx.dataSource
        .getRepository(ProductionConsumption)
        .createQueryBuilder('c')
        .innerJoin('production_entries', 'e', 'e.id = c.entry_id')
        .where('e.batch_id = :batchId', { batchId })
        .getMany();
      expect(consumptions).toHaveLength(2);
    });
  });

  describe('LEK-02 fuel variance', () => {
    beforeAll(async () => {
      // Two more batches on different days for a 3-batch comparison window.
      // Both fire 10,000 bricks; one burns 1,460 kg coal (ratio 146) and one
      // 2,000 kg (ratio 200). With C2 at 150, median is 150 and only the 200
      // batch should drift past the 15 % threshold.
      const seed = async (chamber: string, batchDate: string, firedDate: string, coalQty: string) => {
        const open = await createBatch(fx.tokenA, { siteId: siteA.id, chamber, batchDate }).expect(201);
        const id = open.body.data.id as string;
        await making(fx.tokenA, id, {
          entryDate: batchDate,
          greenBricks: '10000',
          consumption: [{ itemId: soil.id, warehouseId: rawYardA.id, quantity: '1000' }],
        }).expect(201);
        await firing(fx.tokenA, id, {
          entryDate: firedDate,
          firedBricks: '10000',
          consumption: [{ itemId: coal.id, warehouseId: rawYardA.id, quantity: coalQty }],
        }).expect(201);
      };
      await seed('C3', '2026-09-20', '2026-09-21', '1460');
      await seed('C4', '2026-09-28', '2026-09-29', '2000');
    });

    it('flags the batch whose fuel-per-1000 drifts more than 15 % from the median', async () => {
      const res = await request(fx.app.getHttpServer())
        .get('/api/v1/production/fuel-variance')
        .query({ from: '2026-09-01', to: '2026-09-30', itemId: coal.id, groupBy: 'batch' })
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);

      // Three batches in window: C2 (ratio 153.06 ≈ 1500/9800*1000), C3 (146.00),
      // C4 (200.00). Median = 153.06, drift for 200 ≈ 30.7 % → flagged.
      expect(res.body.data).toHaveLength(3);
      const byChamber = new Map(
        (res.body.data as Array<{ groupLabel: string; isOutlier: boolean; ratio: string }>).map((r) => [
          r.groupLabel.split(' · ')[0],
          r,
        ]),
      );
      expect(byChamber.get('C2')?.isOutlier).toBe(false);
      expect(byChamber.get('C3')?.isOutlier).toBe(false);
      expect(byChamber.get('C4')?.isOutlier).toBe(true);
      expect(byChamber.get('C4')?.ratio).toBe('200.000');
    });

    it('sums fuel and fired bricks when grouped by kiln', async () => {
      const res = await request(fx.app.getHttpServer())
        .get('/api/v1/production/fuel-variance')
        .query({ from: '2026-09-01', to: '2026-09-30', itemId: coal.id, groupBy: 'kiln' })
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].siteId).toBe(siteA.id);
      // 1500 + 1460 + 2000 = 4960 coal across 9800 + 10000 + 10000 = 29800 fired.
      expect(res.body.data[0].fuelConsumed).toBe('4960.000');
      expect(res.body.data[0].firedTotal).toBe('29800.000');
    });

    it('refuses a fuel-variance query naming another company’s item', async () => {
      const res = await request(fx.app.getHttpServer())
        .get('/api/v1/production/fuel-variance')
        .query({ from: '2026-09-01', to: '2026-09-30', itemId: coalB.id })
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(422);
      expect(res.body.error.code).toBe('PRODUCTION_FUEL_ITEM_NOT_FOUND');
    });

    it('company B cannot query LEK-02 against company A’s fuel item', async () => {
      const res = await request(fx.app.getHttpServer())
        .get('/api/v1/production/fuel-variance')
        .query({ from: '2026-09-01', to: '2026-09-30', itemId: coal.id })
        .set('Authorization', `Bearer ${fx.tokenB}`)
        .expect(422);
      expect(res.body.error.code).toBe('PRODUCTION_FUEL_ITEM_NOT_FOUND');
    });
  });

  // ------------------------------------------------------------------
  // Tenancy
  // ------------------------------------------------------------------

  describe('tenancy', () => {
    it('company B cannot create a batch on company A’s kiln', async () => {
      await createBatch(fx.tokenB, {
        siteId: siteA.id,
        chamber: 'X9',
        batchDate: BATCH_DATE,
      }).expect(404);
    });

    it('company B cannot see company A’s batches', async () => {
      const res = await request(fx.app.getHttpServer())
        .get('/api/v1/production/batches')
        .set('Authorization', `Bearer ${fx.tokenB}`)
        .expect(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('company B cannot read or record stages on company A’s batch', async () => {
      const list = await request(fx.app.getHttpServer())
        .get('/api/v1/production/batches')
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);
      const foreignBatchId = list.body.data[0].id as string;
      await postJson('get', `/api/v1/production/batches/${foreignBatchId}`, fx.tokenB).expect(404);
      await making(fx.tokenB, foreignBatchId, { entryDate: MAKING_DATE, greenBricks: '1' }).expect(404);
    });
  });

  // ------------------------------------------------------------------
  // Permission split (production.view vs production.manage)
  // ------------------------------------------------------------------

  describe('permission split', () => {
    let accountantToken: string;
    const password = 'production.test-pw';

    beforeAll(async () => {
      const ds = fx.dataSource;
      const accountantRole = await ds.getRepository(Role).findOneByOrFail({ code: 'accountant' });
      const userRepo = ds.getRepository(User);
      const membershipRepo = ds.getRepository(UserCompany);
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await userRepo.save(
        userRepo.create({
          email: `accountant@production.test`,
          mobile: '9100000113',
          name: 'Accountant',
          passwordHash,
        }),
      );
      await membershipRepo.save(
        membershipRepo.create({
          userId: user.id,
          companyId: fx.companyA.id,
          roleId: accountantRole.id,
          isDefault: true,
        }),
      );
      const res = await request(fx.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ emailOrMobile: user.email, password })
        .expect(200);
      accountantToken = res.body.data.accessToken as string;
    });

    it('an Accountant can read batches', async () => {
      await request(fx.app.getHttpServer())
        .get('/api/v1/production/batches')
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);
    });

    it('an Accountant cannot post a stage', async () => {
      await createBatch(accountantToken, {
        siteId: siteA.id,
        chamber: 'X1',
        batchDate: BATCH_DATE,
      }).expect(403);
    });
  });
});
