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
import { makeBrickGrade } from './helpers/brick-grade';
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
        'idempotency_keys',
        'stock_movements',
        'parties',
        'ledgers',
        'voucher_sequences',
        'voucher_types',
        'ledger_groups',
        'brick_types',
        'items',
        'units',
        'warehouses',
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

    classOne = await makeBrickGrade(ds, { companyId: fx.companyA.id, grade: 'Class 1' });
    classTwo = await makeBrickGrade(ds, { companyId: fx.companyA.id, grade: 'Class 2' });
    gradeB = await makeBrickGrade(ds, { companyId: fx.companyB.id, grade: 'Grade B1' });

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

    it('sorts into the pile a sale takes out of — one yard, not two (ADR-051)', async () => {
      // The bug this closes: production stocked a grade and sales deducted an
      // item, so a kiln could fire 7,000 bricks and still be told the yard was
      // empty. Asking by the grade and by its item has to give one number.
      const stock = fx.app.get(StockService);
      const byGrade = await stock.currentBalance(fx.companyA.id, {
        warehouseId: warehouseA.id,
        brickTypeId: classOne.id,
      });
      const byItem = await stock.currentBalance(fx.companyA.id, {
        warehouseId: warehouseA.id,
        itemId: classOne.itemId,
      });
      expect(byItem).toBe(byGrade);
      expect(Number(byItem)).toBeGreaterThan(0);

      // And the ledger row says both: the item it is stocked as, and the grade
      // it was sorted into.
      const row = await fx.dataSource.query<{ item_id: string; brick_type_id: string }[]>(
        `SELECT "item_id", "brick_type_id" FROM "stock_movements"
         WHERE "company_id" = $1 AND "brick_type_id" = $2 AND "movement_type" = 'production'
         ORDER BY "created_at" DESC LIMIT 1`,
        [fx.companyA.id, classOne.id],
      );
      expect(row[0]!.item_id).toBe(classOne.itemId);
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
      // Found by label, not by position: this used to assert `toHaveLength(1)`
      // and passed only because it ran before the LEK-02 fixtures seeded more
      // batches into the same window.
      const row = (res.body.data as { groupLabel: string }[]).find((r) => r.groupLabel.startsWith('C1 ·')) as Record<
        string,
        unknown
      >;
      expect(row).toBeDefined();
      expect(row.greenMoulded).toBe('10000.000');
      expect(row.fired).toBe('9800.000');
      expect(row.goodTotal).toBe('9500.000');
      expect(row.broken).toBe('200.000');
      expect(row.rejects).toBe('100.000');
      expect(row.unexplained).toBe('200.000');
      expect(row.sortingComplete).toBe(true);

      // The two losses the single `unexplained` figure used to conflate:
      // 10,000 − 9,800 went in the drying shed (normal), and 9,800 − 9,800
      // came out of the kiln accounted for (no theft signal).
      expect(row.preFiringLoss).toBe('200.000');
      expect(row.postFiringLoss).toBe('0.000');
    });

    it('does not accuse an unsorted batch of losing everything', async () => {
      // The defect: good/broken/rejects are all zero until sorting happens, so
      // `green − (0+0+0)` reported every batch still in the kiln as 100 % loss
      // on the anti-theft screen.
      const open = await createBatch(fx.tokenA, {
        siteId: siteA.id,
        chamber: 'UNSORTED',
        batchDate: '2026-05-02',
      }).expect(201);
      await making(fx.tokenA, open.body.data.id as string, {
        entryDate: '2026-05-02',
        greenBricks: '10000',
      }).expect(201);

      const res = await request(fx.app.getHttpServer())
        .get('/api/v1/production/yield-variance')
        .query({ from: '2026-05-01', to: '2026-05-31' })
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);

      const row = (res.body.data as { groupLabel: string }[]).find((r) =>
        r.groupLabel.startsWith('UNSORTED ·'),
      ) as Record<string, unknown>;
      expect(row.greenMoulded).toBe('10000.000');
      expect(row.unexplained).toBeNull();
      expect(row.postFiringLoss).toBeNull();
      expect(row.sortingComplete).toBe(false);
      expect(row.pendingSortCount).toBe(1);
    });

    it('keeps a group incomplete while any of its batches is unsorted', async () => {
      const res = await request(fx.app.getHttpServer())
        .get('/api/v1/production/yield-variance')
        .query({ from: '2026-05-01', to: '2026-05-31', groupBy: 'chamber' })
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);

      const row = (res.body.data as { chamber: string }[]).find((r) => r.chamber === 'UNSORTED') as Record<
        string,
        unknown
      >;
      expect(row.sortingComplete).toBe(false);
      expect(row.unexplained).toBeNull();
      expect(row.batchCount).toBe(1);
    });

    it('groups by Sardar when asked', async () => {
      const res = await request(fx.app.getHttpServer())
        .get('/api/v1/production/yield-variance')
        .query({ from: '2026-09-01', to: '2026-10-31', groupBy: 'sardar' })
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);
      const named = (res.body.data as { sardarPartyId: string | null }[]).find(
        (r) => r.sardarPartyId === sardarA.id,
      ) as Record<string, unknown>;
      expect(named).toBeDefined();
      expect(named.groupLabel).toBe('Ramesh Sardar');
    });

    it('gives unattributed production its own bucket instead of dropping it', async () => {
      // Batches moulded without a named Sardar used to vanish from the gang
      // view, so the gang totals did not reconcile with the batch totals — and
      // unattributed output is exactly where a loss would be parked.
      const res = await request(fx.app.getHttpServer())
        .get('/api/v1/production/yield-variance')
        .query({ from: '2026-05-01', to: '2026-10-31', groupBy: 'sardar' })
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);

      const unassigned = (res.body.data as { sardarPartyId: string | null }[]).find(
        (r) => r.sardarPartyId === null,
      ) as Record<string, unknown>;
      expect(unassigned).toBeDefined();
      expect(unassigned.groupLabel).toBe('No Sardar recorded');
      expect(Number(unassigned.greenMoulded)).toBeGreaterThan(0);
    });

    it('refuses to show another company its yield', async () => {
      const res = await request(fx.app.getHttpServer())
        .get('/api/v1/production/yield-variance')
        .query({ from: '2026-05-01', to: '2026-10-31' })
        .set('Authorization', `Bearer ${fx.tokenB}`)
        .expect(200);
      expect(res.body.data).toHaveLength(0);
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

  // ------------------------------------------------------------------
  // SYN-01 idempotency on production creates
  // ------------------------------------------------------------------

  describe('SYN-01 idempotency', () => {
    const postWithKey = (url: string, token: string, key: string | null, body: Record<string, unknown>) => {
      const req = request(fx.app.getHttpServer()).post(url).set('Authorization', `Bearer ${token}`);
      if (key) req.set('Idempotency-Key', key);
      return req.send(body);
    };

    it('replays the same batch when the same key is sent twice', async () => {
      const key = '11111111-1111-4111-8111-111111111111';
      const body = { siteId: siteA.id, chamber: 'IDEM-A', batchDate: '2026-09-05' };
      const first = await postWithKey('/api/v1/production/batches', fx.tokenA, key, body).expect(201);
      const second = await postWithKey('/api/v1/production/batches', fx.tokenA, key, body).expect(201);
      expect(second.body.data.id).toBe(first.body.data.id);

      // Only one row actually in the DB — the duplicate (site, chamber, date)
      // partial unique would otherwise have thrown PRODUCTION_BATCH_DUPLICATE.
      const list = await request(fx.app.getHttpServer())
        .get('/api/v1/production/batches')
        .query({ limit: 100 })
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);
      const matches = (list.body.data as Array<{ chamber: string }>).filter((b) => b.chamber === 'IDEM-A');
      expect(matches).toHaveLength(1);
    });

    it('refuses the same key with a different body', async () => {
      const key = '22222222-2222-4222-8222-222222222222';
      await postWithKey('/api/v1/production/batches', fx.tokenA, key, {
        siteId: siteA.id,
        chamber: 'IDEM-B',
        batchDate: '2026-09-06',
      }).expect(201);
      const res = await postWithKey('/api/v1/production/batches', fx.tokenA, key, {
        siteId: siteA.id,
        chamber: 'IDEM-B-OTHER',
        batchDate: '2026-09-06',
      }).expect(422);
      expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
    });

    it('without the header, two POSTs behave as two independent requests', async () => {
      // No key → the second one trips PRODUCTION_BATCH_DUPLICATE from the
      // business unique, which proves the second request actually hit the
      // service and was not short-circuited.
      await postWithKey('/api/v1/production/batches', fx.tokenA, null, {
        siteId: siteA.id,
        chamber: 'IDEM-C',
        batchDate: '2026-09-07',
      }).expect(201);
      const res = await postWithKey('/api/v1/production/batches', fx.tokenA, null, {
        siteId: siteA.id,
        chamber: 'IDEM-C',
        batchDate: '2026-09-07',
      }).expect(422);
      expect(res.body.error.code).toBe('PRODUCTION_BATCH_DUPLICATE');
    });

    it('the same key in two companies does not collide', async () => {
      const key = '33333333-3333-4333-8333-333333333333';
      const a = await postWithKey('/api/v1/production/batches', fx.tokenA, key, {
        siteId: siteA.id,
        chamber: 'IDEM-D',
        batchDate: '2026-09-08',
      }).expect(201);
      const b = await postWithKey('/api/v1/production/batches', fx.tokenB, key, {
        siteId: siteB.id,
        chamber: 'IDEM-D',
        batchDate: '2026-09-08',
      }).expect(201);
      expect(a.body.data.id).not.toBe(b.body.data.id);
    });

    it('refuses a key longer than the column with a 400, not a 500', async () => {
      // `idempotency_keys.key` is varchar(100). Without the length check the
      // business write ran first and the insert then failed with 22001, so the
      // caller got a 500 — and a queued mobile write retries a 500 forever.
      const res = await postWithKey('/api/v1/production/batches', fx.tokenA, 'k'.repeat(101), {
        siteId: siteA.id,
        chamber: 'IDEM-LONG',
        batchDate: '2026-09-09',
      }).expect(400);
      expect(res.body.error.message).toMatch(/Idempotency-Key/);

      // The write must not have happened: a 400 the device gives up on has to
      // mean nothing was created.
      const list = await request(fx.app.getHttpServer())
        .get('/api/v1/production/batches')
        .query({ limit: 100 })
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);
      expect((list.body.data as Array<{ chamber: string }>).some((b) => b.chamber === 'IDEM-LONG')).toBe(false);
    });

    it('accepts a key of exactly the maximum length', async () => {
      const res = await postWithKey('/api/v1/production/batches', fx.tokenA, 'k'.repeat(100), {
        siteId: siteA.id,
        chamber: 'IDEM-MAX',
        batchDate: '2026-09-10',
      }).expect(201);
      expect(res.body.data.chamber).toBe('IDEM-MAX');
    });

    it('creates one batch when eight identical requests arrive at once', async () => {
      // SYN-01's whole correctness argument is the advisory lock in
      // IdempotencyService. A device coming back on a flaky network resends the
      // queue, and nothing makes those arrive one at a time. Mirrors the
      // concurrency test ADR-027 rests on in stock.e2e-spec.
      const key = '44444444-4444-4444-8444-444444444444';
      const body = { siteId: siteA.id, chamber: 'IDEM-RACE', batchDate: '2026-09-11' };

      const responses = await Promise.all(
        Array.from({ length: 8 }, () => postWithKey('/api/v1/production/batches', fx.tokenA, key, body)),
      );

      expect(responses.map((r) => r.status)).toEqual(Array(8).fill(201));
      const ids = new Set(responses.map((r) => r.body.data.id as string));
      expect(ids.size).toBe(1);
      // Every field, not merely the id: a replay is the stored response. Compared
      // field by field because jsonb does not keep the key order it was given,
      // so the replays come back with the same payload in a different order.
      for (const r of responses) expect(r.body).toEqual(responses[0]!.body);

      const rows = await fx.dataSource.query(
        `SELECT count(*)::int AS n FROM "production_batches" WHERE "company_id" = $1 AND "chamber" = $2`,
        [fx.companyA.id, 'IDEM-RACE'],
      );
      expect(rows[0].n).toBe(1);
    });
  });

  // ------------------------------------------------------------------
  // Repairs found by the P5.1 audit
  // ------------------------------------------------------------------

  describe('LEK-02 repairs', () => {
    it('treats "no coal booked" as unknown, not as zero coal', async () => {
      // A missing consumption row used to produce ratio "0.000", which is not a
      // frugal kiln — and it dragged the median down for every other batch.
      const open = await createBatch(fx.tokenA, {
        siteId: siteA.id,
        chamber: 'NOFUEL',
        batchDate: '2026-06-10',
      }).expect(201);
      const id = open.body.data.id as string;
      await making(fx.tokenA, id, { entryDate: '2026-06-10', greenBricks: '10000' }).expect(201);
      await firing(fx.tokenA, id, { entryDate: '2026-06-11', firedBricks: '10000' }).expect(201);

      const res = await request(fx.app.getHttpServer())
        .get('/api/v1/production/fuel-variance')
        .query({ from: '2026-06-01', to: '2026-06-30', itemId: coal.id })
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);

      const row = (res.body.data as { groupLabel: string }[]).find((r) =>
        r.groupLabel.startsWith('NOFUEL ·'),
      ) as Record<string, unknown>;
      expect(row.ratio).toBeNull();
      expect(row.fuelRecorded).toBe(false);
      expect(row.isOutlier).toBe(false);
    });

    it('does not flag an outlier from two rows, where the median is just their mean', async () => {
      // With n=2 both rows are equidistant from the "median", so the flag was
      // all-or-nothing: either both fire or neither does.
      const seed = async (chamber: string, date: string, fired: string, coalQty: string) => {
        const open = await createBatch(fx.tokenA, { siteId: siteA.id, chamber, batchDate: date }).expect(201);
        const id = open.body.data.id as string;
        await making(fx.tokenA, id, { entryDate: date, greenBricks: fired }).expect(201);
        await firing(fx.tokenA, id, {
          entryDate: date,
          firedBricks: fired,
          consumption: [{ itemId: coal.id, warehouseId: rawYardA.id, quantity: coalQty }],
        }).expect(201);
      };
      // 100 vs 140 per 1,000 — a 40 % gap, which the old code flagged on BOTH.
      await seed('TWO-A', '2026-08-05', '10000', '1000');
      await seed('TWO-B', '2026-08-06', '10000', '1400');

      const res = await request(fx.app.getHttpServer())
        .get('/api/v1/production/fuel-variance')
        .query({ from: '2026-08-01', to: '2026-08-31', itemId: coal.id })
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect((res.body.data as { isOutlier: boolean }[]).every((r) => !r.isOutlier)).toBe(true);
    });

    it('buckets fuel by the month it was burned, not the month the batch was loaded', async () => {
      // Loaded 28 Jun, fired 3 Jul: the coal belongs to July. On batch_date it
      // was filed under June and vanished from a July-only window.
      const open = await createBatch(fx.tokenA, {
        siteId: siteA.id,
        chamber: 'SPAN',
        batchDate: '2026-06-28',
      }).expect(201);
      const id = open.body.data.id as string;
      await making(fx.tokenA, id, { entryDate: '2026-06-28', greenBricks: '10000' }).expect(201);
      await firing(fx.tokenA, id, {
        entryDate: '2026-07-03',
        firedBricks: '10000',
        consumption: [{ itemId: coal.id, warehouseId: rawYardA.id, quantity: '2000' }],
      }).expect(201);

      const march = await request(fx.app.getHttpServer())
        .get('/api/v1/production/fuel-variance')
        .query({ from: '2026-07-01', to: '2026-07-31', itemId: coal.id, groupBy: 'month' })
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);
      expect(march.body.data).toHaveLength(1);
      expect((march.body.data[0] as { periodMonth: string }).periodMonth).toBe('2026-07');
      expect((march.body.data[0] as { fuelConsumed: string }).fuelConsumed).toBe('2000.000');

      // June holds another batch legitimately (fired in June, no coal booked),
      // so the point is narrower: SPAN's 2,000 kg must not be counted there.
      const june = await request(fx.app.getHttpServer())
        .get('/api/v1/production/fuel-variance')
        .query({ from: '2026-06-01', to: '2026-06-30', itemId: coal.id, groupBy: 'month' })
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);
      const juneFuel = (june.body.data as { fuelConsumed: string }[]).reduce(
        (total, r) => total + Number(r.fuelConsumed),
        0,
      );
      expect(juneFuel).toBe(0);
    });
  });

  describe('future-dated production', () => {
    it('refuses a batch dated after today', async () => {
      const res = await createBatch(fx.tokenA, {
        siteId: siteA.id,
        chamber: 'FUTURE',
        batchDate: '2099-01-01',
      }).expect(422);
      expect(res.body.error.code).toBe('PRODUCTION_DATE_IN_FUTURE');
    });

    it('refuses a stage dated after today, even one that moves no stock', async () => {
      // Stock already refused future movements (ADR-028), but drying moves
      // none — so this stage could carry a mistyped year straight into every
      // report that buckets by date.
      const open = await createBatch(fx.tokenA, {
        siteId: siteA.id,
        chamber: 'FUTURE-STAGE',
        batchDate: '2026-05-03',
      }).expect(201);
      const id = open.body.data.id as string;
      await making(fx.tokenA, id, { entryDate: '2026-05-03', greenBricks: '1000' }).expect(201);

      const res = await request(fx.app.getHttpServer())
        .post(`/api/v1/production/batches/${id}/drying`)
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .send({ entryDate: '2099-01-01' })
        .expect(422);
      expect(res.body.error.code).toBe('PRODUCTION_DATE_IN_FUTURE');
    });
  });

  describe('PRD-07 production report', () => {
    it('reports good bricks by period, kiln and grade', async () => {
      const res = await request(fx.app.getHttpServer())
        .get('/api/v1/production/report')
        .query({ from: '2026-09-01', to: '2026-10-31', groupBy: 'month' })
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);

      const rows = res.body.data.rows as { grade: string; goodBricks: string; period: string }[];
      // The first flow sorted 7,000 of one grade and 2,500 of the other.
      const first = rows.find((r) => r.goodBricks === '7000.000');
      const second = rows.find((r) => r.goodBricks === '2500.000');
      expect(first).toBeDefined();
      expect(second).toBeDefined();
      expect(first!.period).toMatch(/^\d{4}-\d{2}$/);
      expect(res.body.data.totals.goodBricks).toBe('9500.000');
      expect(res.body.data.totals.batchCount).toBe(1);
    });

    it('narrows to one grade', async () => {
      const res = await request(fx.app.getHttpServer())
        .get('/api/v1/production/report')
        .query({ from: '2026-09-01', to: '2026-10-31', brickTypeId: classOne.id })
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .expect(200);
      const rows = res.body.data.rows as { brickTypeId: string }[];
      expect(rows.every((r) => r.brickTypeId === classOne.id)).toBe(true);
    });

    it('shows another company nothing', async () => {
      const res = await request(fx.app.getHttpServer())
        .get('/api/v1/production/report')
        .query({ from: '2026-09-01', to: '2026-10-31' })
        .set('Authorization', `Bearer ${fx.tokenB}`)
        .expect(200);
      expect(res.body.data.rows).toHaveLength(0);
      expect(res.body.data.totals.goodBricks).toBe('0.000');
    });
  });
});
