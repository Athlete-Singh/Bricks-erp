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
import { Party } from '../src/modules/parties/entities/party.entity';
import { PartyService } from '../src/modules/parties/party.service';
import { StockService } from '../src/stock/stock.service';
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
  let classOne: BrickType;
  let classTwo: BrickType;
  let gradeB: BrickType;
  let sardarA: Party;

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
        'production_sorting_outputs',
        'production_entries',
        'production_batches',
        'stock_movements',
        'parties',
        'ledgers',
        'voucher_sequences',
        'voucher_types',
        'ledger_groups',
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
    // Company B needs at least one warehouse so its fixtures look like company A's.
    await ds
      .getRepository(Warehouse)
      .save(ds.getRepository(Warehouse).create({ companyId: fx.companyB.id, siteId: siteB.id, name: 'Other Yard' }));

    classOne = await ds
      .getRepository(BrickType)
      .save(ds.getRepository(BrickType).create({ companyId: fx.companyA.id, grade: 'Class 1' }));
    classTwo = await ds
      .getRepository(BrickType)
      .save(ds.getRepository(BrickType).create({ companyId: fx.companyA.id, grade: 'Class 2' }));
    gradeB = await ds
      .getRepository(BrickType)
      .save(ds.getRepository(BrickType).create({ companyId: fx.companyB.id, grade: 'Grade B1' }));

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
