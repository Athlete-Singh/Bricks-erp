import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { Role } from '../src/modules/auth/entities/role.entity';
import { User } from '../src/modules/auth/entities/user.entity';
import { UserCompany } from '../src/modules/auth/entities/user-company.entity';
import { Site } from '../src/modules/company/entities/site.entity';
import { Warehouse } from '../src/modules/inventory/entities/warehouse.entity';
import { Unit } from '../src/modules/inventory/entities/unit.entity';
import { Item } from '../src/modules/inventory/entities/item.entity';
import { BrickType } from '../src/modules/inventory/entities/brick-type.entity';
import { createTenantFixture, type TenantFixture } from './helpers/tenant-fixture';

jest.setTimeout(40000);

/** INV-03, INV-04, INV-06 — the stock ledger, against real Postgres. */
describe('Stock (e2e)', () => {
  let fx: TenantFixture;
  let warehouseA: Warehouse;
  let warehouseA2: Warehouse;
  let warehouseB: Warehouse;
  let coal: Item;
  let diesel: Item;
  let classOne: BrickType;
  let gradeB: BrickType;

  const opening = (token: string, body: Record<string, unknown>) =>
    request(fx.app.getHttpServer()).post('/api/v1/stock/opening').set('Authorization', `Bearer ${token}`).send(body);

  const adjust = (token: string, body: Record<string, unknown>) =>
    request(fx.app.getHttpServer())
      .post('/api/v1/stock/adjustments')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const balance = (token: string, query: Record<string, string>) =>
    request(fx.app.getHttpServer()).get('/api/v1/stock/balance').query(query).set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    fx = await createTenantFixture({
      prefix: 'Stock Test',
      domain: 'stock.test',
      tables: ['stock_movements', 'items', 'warehouses', 'brick_types', 'units', 'sites'],
      mobilePrefix: '910000006',
    });

    const ds = fx.dataSource;
    const site = (companyId: string, code: string) =>
      ds.getRepository(Site).save(ds.getRepository(Site).create({ companyId, name: `Kiln ${code}`, code }));
    const siteA = await site(fx.companyA.id, 'SA');
    const siteB = await site(fx.companyB.id, 'SB');

    const wh = (companyId: string, siteId: string, name: string) =>
      ds.getRepository(Warehouse).save(ds.getRepository(Warehouse).create({ companyId, siteId, name }));
    warehouseA = await wh(fx.companyA.id, siteA.id, 'Main Yard');
    warehouseA2 = await wh(fx.companyA.id, siteA.id, 'Coal Shed');
    warehouseB = await wh(fx.companyB.id, siteB.id, 'Their Yard');

    const unit = await ds
      .getRepository(Unit)
      .save(ds.getRepository(Unit).create({ companyId: fx.companyA.id, name: 'Tonnes', abbreviation: 't' }));

    const item = (name: string, isActive = true) =>
      ds
        .getRepository(Item)
        .save(
          ds
            .getRepository(Item)
            .create({ companyId: fx.companyA.id, name, category: 'raw_material', unitId: unit.id, isActive }),
        );
    coal = await item('Coal');
    diesel = await item('Diesel', false);

    const grade = (name: string) =>
      ds.getRepository(BrickType).save(ds.getRepository(BrickType).create({ companyId: fx.companyA.id, grade: name }));
    classOne = await grade('Class 1');
    gradeB = await grade('Jhama');
  });

  afterAll(async () => {
    await fx.close();
  });

  describe('opening stock (INV-03)', () => {
    it('records opening stock for an item', async () => {
      const res = await opening(fx.tokenA, {
        warehouseId: warehouseA.id,
        itemId: coal.id,
        quantity: '250.5',
        movementDate: '2026-04-01',
      }).expect(201);

      expect(res.body.data.quantityIn).toBe('250.500');
      expect(res.body.data.quantityOut).toBe('0.000');
      expect(res.body.data.movementType).toBe('opening');
      // The site comes from the warehouse, never from the request.
      expect(res.body.data.siteId).toBe(warehouseA.siteId);
    });

    it('records opening stock for a brick grade', async () => {
      const res = await opening(fx.tokenA, {
        warehouseId: warehouseA.id,
        brickTypeId: classOne.id,
        quantity: '40000',
        movementDate: '2026-04-01',
      }).expect(201);

      expect(res.body.data.quantityIn).toBe('40000.000');
      expect(res.body.data.itemId).toBeNull();
    });

    it('refuses a second opening row for the same thing in the same place', async () => {
      // A duplicate would silently double the balance the year starts from.
      const res = await opening(fx.tokenA, {
        warehouseId: warehouseA.id,
        itemId: coal.id,
        quantity: '10',
        movementDate: '2026-04-01',
      });
      expect(res.status).toBe(409);
    });

    it('allows the same item to open in a different warehouse', async () => {
      await opening(fx.tokenA, {
        warehouseId: warehouseA2.id,
        itemId: coal.id,
        quantity: '80',
        movementDate: '2026-04-01',
      }).expect(201);
    });
  });

  describe('what the API refuses', () => {
    it('refuses a movement naming both an item and a grade', async () => {
      const res = await opening(fx.tokenA, {
        warehouseId: warehouseA.id,
        itemId: coal.id,
        brickTypeId: classOne.id,
        quantity: '5',
        movementDate: '2026-04-01',
      }).expect(400);
      expect(res.body.error.details).toBeDefined();
    });

    it('refuses a movement naming neither', async () => {
      await opening(fx.tokenA, {
        warehouseId: warehouseA.id,
        quantity: '5',
        movementDate: '2026-04-01',
      }).expect(400);
    });

    it('refuses a zero quantity', async () => {
      await opening(fx.tokenA, {
        warehouseId: warehouseA.id,
        brickTypeId: gradeB.id,
        quantity: '0',
        movementDate: '2026-04-01',
      }).expect(400);
    });

    it('refuses more than three decimals — the column holds three', async () => {
      await opening(fx.tokenA, {
        warehouseId: warehouseA.id,
        brickTypeId: gradeB.id,
        quantity: '1.2345',
        movementDate: '2026-04-01',
      }).expect(400);
    });

    it('refuses an inactive item', async () => {
      const res = await opening(fx.tokenA, {
        warehouseId: warehouseA.id,
        itemId: diesel.id,
        quantity: '5',
        movementDate: '2026-04-01',
      }).expect(422);
      expect(res.body.error.code).toBe('ITEM_INACTIVE');
    });
  });

  describe('adjustments (INV-06)', () => {
    it('adds stock found in a count', async () => {
      const res = await adjust(fx.tokenA, {
        warehouseId: warehouseA.id,
        brickTypeId: classOne.id,
        direction: 'in',
        quantity: '500',
        movementDate: '2026-10-09',
        reason: 'Physical count found 500 more than the system',
      }).expect(201);

      expect(res.body.data.movementType).toBe('adjustment');
      expect(res.body.data.notes).toContain('Physical count');
    });

    it('refuses an adjustment with no real reason', async () => {
      const res = await adjust(fx.tokenA, {
        warehouseId: warehouseA.id,
        brickTypeId: classOne.id,
        direction: 'out',
        quantity: '10',
        movementDate: '2026-10-09',
        reason: 'fixed',
      }).expect(400);
      expect(res.body.error.details).toBeDefined();
    });

    it('may take a balance below zero, because the yard is the source of truth', async () => {
      await adjust(fx.tokenA, {
        warehouseId: warehouseA2.id,
        brickTypeId: gradeB.id,
        direction: 'out',
        quantity: '25',
        movementDate: '2026-10-09',
        reason: 'Counted short against a yard that was never opened',
      }).expect(201);

      const res = await balance(fx.tokenA, {
        warehouseId: warehouseA2.id,
        brickTypeId: gradeB.id,
      }).expect(200);
      expect(res.body.data.balance).toBe('-25.000');
    });
  });

  describe('the balance', () => {
    it('is opening plus in minus out', async () => {
      // 250.5 opening, +500 would be the grade; for coal: 250.5 then −50.5
      await adjust(fx.tokenA, {
        warehouseId: warehouseA.id,
        itemId: coal.id,
        direction: 'out',
        quantity: '50.5',
        movementDate: '2026-10-09',
        reason: 'Consumed by firing before the production module exists',
      }).expect(201);

      const res = await balance(fx.tokenA, { warehouseId: warehouseA.id, itemId: coal.id }).expect(200);
      expect(res.body.data.balance).toBe('200.000');
    });

    it('keeps each warehouse separate', async () => {
      const res = await balance(fx.tokenA, { warehouseId: warehouseA2.id, itemId: coal.id }).expect(200);
      expect(res.body.data.balance).toBe('80.000');
    });

    it('keeps items and grades separate in the same warehouse', async () => {
      const res = await balance(fx.tokenA, { warehouseId: warehouseA.id, brickTypeId: classOne.id }).expect(200);
      expect(res.body.data.balance).toBe('40500.000');
    });
  });

  describe('who may adjust (INV-06 — restricted)', () => {
    let storeKeeperToken: string;

    beforeAll(async () => {
      const ds = fx.dataSource;
      const roleRepo = ds.getRepository(Role);
      const userRepo = ds.getRepository(User);
      const membershipRepo = ds.getRepository(UserCompany);

      const storeKeeper = await roleRepo.findOneByOrFail({ code: 'store_keeper' });
      const passwordHash = await bcrypt.hash('stock.test-pw', 10);
      const user = await userRepo.save(
        userRepo.create({
          email: 'keeper@stock.test',
          mobile: '9100000069',
          name: 'Store Keeper',
          passwordHash,
        }),
      );
      await membershipRepo.save(
        membershipRepo.create({
          userId: user.id,
          companyId: fx.companyA.id,
          roleId: storeKeeper.id,
          isDefault: true,
        }),
      );

      const login = await request(fx.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ emailOrMobile: 'keeper@stock.test', password: 'stock.test-pw' })
        .expect(200);
      storeKeeperToken = login.body.data.accessToken;
    });

    it('lets a store keeper record ordinary stock', async () => {
      await opening(storeKeeperToken, {
        warehouseId: warehouseA2.id,
        brickTypeId: classOne.id,
        quantity: '100',
        movementDate: '2026-04-01',
      }).expect(201);
    });

    it('refuses to let a store keeper adjust it', async () => {
      // Separation of duties: the person holding the stock must not be able to
      // write off a shortfall. This is the control, so it gets a test.
      await adjust(storeKeeperToken, {
        warehouseId: warehouseA2.id,
        brickTypeId: classOne.id,
        direction: 'out',
        quantity: '100',
        movementDate: '2026-10-09',
        reason: 'Trying to make a shortfall disappear',
      }).expect(403);
    });

    it('lets the owner adjust', async () => {
      await adjust(fx.tokenA, {
        warehouseId: warehouseA2.id,
        brickTypeId: classOne.id,
        direction: 'out',
        quantity: '10',
        movementDate: '2026-10-09',
        reason: 'Signed off by the owner after a recount',
      }).expect(201);
    });
  });

  describe('tenant isolation', () => {
    it('refuses a warehouse belonging to another company', async () => {
      const res = await opening(fx.tokenA, {
        warehouseId: warehouseB.id,
        brickTypeId: classOne.id,
        quantity: '10',
        movementDate: '2026-04-01',
      }).expect(422);
      expect(res.body.error.code).toBe('WAREHOUSE_NOT_FOUND');
    });

    it('refuses an item belonging to another company', async () => {
      const res = await opening(fx.tokenB, {
        warehouseId: warehouseB.id,
        itemId: coal.id,
        quantity: '10',
        movementDate: '2026-04-01',
      }).expect(422);
      expect(res.body.error.code).toBe('ITEM_NOT_FOUND');
    });

    it('shows company B a zero balance for company A stock', async () => {
      const res = await balance(fx.tokenB, { warehouseId: warehouseA.id, itemId: coal.id }).expect(200);
      expect(res.body.data.balance).toBe('0.000');
    });

    it('rejects a request with no bearer token', async () => {
      await request(fx.app.getHttpServer()).get('/api/v1/stock/balance').expect(401);
    });
  });
});
