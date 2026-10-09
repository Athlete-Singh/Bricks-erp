import request from 'supertest';
import { DataSource } from 'typeorm';
import { Site } from '../src/modules/company/entities/site.entity';
import { Warehouse } from '../src/modules/inventory/entities/warehouse.entity';
import { Unit } from '../src/modules/inventory/entities/unit.entity';
import { Item } from '../src/modules/inventory/entities/item.entity';
import { BrickType } from '../src/modules/inventory/entities/brick-type.entity';
import { StockMovement } from '../src/stock/entities/stock-movement.entity';
import { createTenantFixture, type TenantFixture } from './helpers/tenant-fixture';

jest.setTimeout(40000);

/** The shapes the reports return, so assertions are not made against `any`. */
interface StockRow {
  warehouseName: string;
  subjectType: 'item' | 'brick';
  subjectName: string;
  unit: string | null;
  opening: string;
  purchased: string;
  produced: string;
  adjustedOut: string;
  sold: string;
  wasted: string;
  closing: string;
}

interface RegisterRow {
  id: string;
  movementDate: string;
  movementType: string;
  warehouseName: string;
  subjectName: string;
  quantityOut: string;
  runningBalance: string | null;
}

const rowsOf = (res: request.Response): StockRow[] => (res.body as { data: { rows: StockRow[] } }).data.rows;
const registerRowsOf = (res: request.Response): RegisterRow[] => (res.body as { data: RegisterRow[] }).data;
const metaOf = (res: request.Response) => (res.body as { meta: { page: number; limit: number; total: number } }).meta;

/**
 * INV-07 — the stock reports.
 *
 * Movements are written straight to the table here rather than through the
 * API, because the API only exposes opening and adjustment; purchase, sale,
 * production and wastage arrive from P5/P7/P9. The reports must already handle
 * them, so the fixture creates them directly.
 */
describe('Stock reports (e2e)', () => {
  let fx: TenantFixture;
  let ds: DataSource;
  let warehouse: Warehouse;
  let shed: Warehouse;
  let coal: Item;
  let classOne: BrickType;

  const current = (token: string, query: Record<string, string> = {}) =>
    request(fx.app.getHttpServer()).get('/api/v1/stock/current').query(query).set('Authorization', `Bearer ${token}`);

  const register = (token: string, query: Record<string, string> = {}) =>
    request(fx.app.getHttpServer()).get('/api/v1/stock/register').query(query).set('Authorization', `Bearer ${token}`);

  /** One movement, written directly so every type can be exercised. */
  async function move(
    subject: { itemId?: string; brickTypeId?: string },
    movementType: string,
    direction: 'in' | 'out',
    quantity: string,
    movementDate: string,
    warehouseId = warehouse.id,
  ) {
    const repo = ds.getRepository(StockMovement);
    const wh = await ds.getRepository(Warehouse).findOneByOrFail({ id: warehouseId });
    return repo.save(
      repo.create({
        companyId: fx.companyA.id,
        siteId: wh.siteId,
        warehouseId,
        itemId: subject.itemId ?? null,
        brickTypeId: subject.brickTypeId ?? null,
        movementType: movementType as never,
        quantityIn: direction === 'in' ? quantity : '0',
        quantityOut: direction === 'out' ? quantity : '0',
        movementDate,
        notes: movementType === 'adjustment' ? 'Counted against the yard on the day' : null,
      }),
    );
  }

  beforeAll(async () => {
    fx = await createTenantFixture({
      prefix: 'Stock Report Test',
      domain: 'stockreport.test',
      tables: ['stock_movements', 'items', 'warehouses', 'brick_types', 'units', 'sites'],
      mobilePrefix: '910000007',
    });
    ds = fx.dataSource;

    const site = await ds
      .getRepository(Site)
      .save(ds.getRepository(Site).create({ companyId: fx.companyA.id, name: 'Kiln One', code: 'K1' }));

    const wh = (name: string) =>
      ds
        .getRepository(Warehouse)
        .save(ds.getRepository(Warehouse).create({ companyId: fx.companyA.id, siteId: site.id, name }));
    warehouse = await wh('Main Yard');
    shed = await wh('Coal Shed');

    const unit = await ds
      .getRepository(Unit)
      .save(ds.getRepository(Unit).create({ companyId: fx.companyA.id, name: 'Tonnes', abbreviation: 't' }));

    coal = await ds
      .getRepository(Item)
      .save(
        ds
          .getRepository(Item)
          .create({ companyId: fx.companyA.id, name: 'Coal', category: 'raw_material', unitId: unit.id }),
      );

    classOne = await ds
      .getRepository(BrickType)
      .save(ds.getRepository(BrickType).create({ companyId: fx.companyA.id, grade: 'Class 1' }));

    // A full year of a brick grade: opening, produced, sold, wasted, adjusted.
    await move({ brickTypeId: classOne.id }, 'opening', 'in', '10000', '2026-04-01');
    await move({ brickTypeId: classOne.id }, 'production', 'in', '50000', '2026-05-10');
    await move({ brickTypeId: classOne.id }, 'sale', 'out', '30000', '2026-06-15');
    await move({ brickTypeId: classOne.id }, 'wastage', 'out', '1500', '2026-06-20');
    await move({ brickTypeId: classOne.id }, 'adjustment', 'out', '500', '2026-07-01');

    // Coal in two places, so warehouse separation can be checked.
    await move({ itemId: coal.id }, 'opening', 'in', '100', '2026-04-01');
    await move({ itemId: coal.id }, 'purchase', 'in', '250.5', '2026-05-01');
    await move({ itemId: coal.id }, 'production', 'out', '80.25', '2026-05-20');
    await move({ itemId: coal.id }, 'opening', 'in', '40', '2026-04-01', shed.id);
  });

  afterAll(async () => {
    await fx.close();
  });

  describe('current stock (INV-07)', () => {
    it('holds the identity: opening + in − out = closing', async () => {
      const res = await current(fx.tokenA).expect(200);
      const bricks = rowsOf(res).find((r) => r.subjectName === 'Class 1')!;

      expect(bricks.opening).toBe('10000.000');
      expect(bricks.produced).toBe('50000.000');
      expect(bricks.sold).toBe('30000.000');
      expect(bricks.wasted).toBe('1500.000');
      expect(bricks.adjustedOut).toBe('500.000');
      // 10000 + 50000 − 30000 − 1500 − 500
      expect(bricks.closing).toBe('28000.000');
    });

    it('adds the decimals exactly — 100 + 250.5 − 80.25', async () => {
      const res = await current(fx.tokenA).expect(200);
      const rows = rowsOf(res).filter((r) => r.subjectName === 'Coal');
      const main = rows.find((r) => r.warehouseName === 'Main Yard')!;

      expect(main.purchased).toBe('250.500');
      expect(main.closing).toBe('270.250');
    });

    it('keeps each warehouse on its own line', async () => {
      const res = await current(fx.tokenA).expect(200);
      const rows = rowsOf(res).filter((r) => r.subjectName === 'Coal');

      expect(rows).toHaveLength(2);
      expect(rows.find((r) => r.warehouseName === 'Coal Shed')?.closing).toBe('40.000');
    });

    it('names the unit an item is measured in, and leaves bricks without one', async () => {
      const res = await current(fx.tokenA).expect(200);
      const rows = rowsOf(res);

      expect(rows.find((r) => r.subjectName === 'Coal')?.unit).toBe('t');
      expect(rows.find((r) => r.subjectName === 'Class 1')?.unit).toBeNull();
    });

    it('answers as at a past date, ignoring everything after it', async () => {
      const res = await current(fx.tokenA, { asOf: '2026-05-31' }).expect(200);
      const bricks = rowsOf(res).find((r) => r.subjectName === 'Class 1')!;

      // The June sale and wastage have not happened yet.
      expect(bricks.sold).toBe('0.000');
      expect(bricks.closing).toBe('60000.000');
    });

    it('folds everything before `from` into opening, so the period columns mean the period', async () => {
      const res = await current(fx.tokenA, { from: '2026-06-01' }).expect(200);
      const bricks = rowsOf(res).find((r) => r.subjectName === 'Class 1')!;

      // 10000 opening + 50000 produced in May
      expect(bricks.opening).toBe('60000.000');
      expect(bricks.produced).toBe('0.000');
      expect(bricks.sold).toBe('30000.000');
      expect(bricks.closing).toBe('28000.000');
    });

    it('narrows to one warehouse', async () => {
      const res = await current(fx.tokenA, { warehouseId: shed.id }).expect(200);
      expect(rowsOf(res)).toHaveLength(1);
      expect(rowsOf(res)[0]?.warehouseName).toBe('Coal Shed');
    });

    it('narrows to items or to grades', async () => {
      const items = await current(fx.tokenA, { subject: 'item' }).expect(200);
      expect(rowsOf(items).every((r) => r.subjectType === 'item')).toBe(true);

      const bricks = await current(fx.tokenA, { subject: 'brick' }).expect(200);
      expect(rowsOf(bricks).every((r) => r.subjectType === 'brick')).toBe(true);
    });

    it('shows company B nothing of company A stock', async () => {
      const res = await current(fx.tokenB).expect(200);
      expect(rowsOf(res)).toHaveLength(0);
    });
  });

  describe('the movement register (INV-07)', () => {
    it('lists movements newest first, paginated', async () => {
      const res = await register(fx.tokenA, { limit: '5' }).expect(200);

      expect(metaOf(res)).toMatchObject({ page: 1, limit: 5 });
      expect(metaOf(res).total).toBe(9);
      expect(registerRowsOf(res)).toHaveLength(5);
      expect(registerRowsOf(res)[0]!.movementDate >= registerRowsOf(res)[1]!.movementDate).toBe(true);
    });

    it('names what moved and where, not just ids', async () => {
      const res = await register(fx.tokenA, { limit: '50' }).expect(200);
      const row = registerRowsOf(res).find((r) => r.movementType === 'sale')!;

      expect(row.subjectName).toBe('Class 1');
      expect(row.warehouseName).toBe('Main Yard');
      expect(row.quantityOut).toBe('30000.000');
    });

    it('filters by movement type', async () => {
      const res = await register(fx.tokenA, { movementType: 'opening' }).expect(200);
      expect(metaOf(res).total).toBe(3);
    });

    it('filters by date range', async () => {
      const res = await register(fx.tokenA, { from: '2026-06-01', to: '2026-06-30' }).expect(200);
      expect(metaOf(res).total).toBe(2);
    });

    it('carries a running balance once narrowed to one subject in one place', async () => {
      const res = await register(fx.tokenA, {
        warehouseId: warehouse.id,
        brickTypeId: classOne.id,
        limit: '50',
      }).expect(200);

      // Newest first, so the first row carries the closing balance.
      const rows = registerRowsOf(res);
      expect(rows[0]!.runningBalance).toBe('28000.000');
      expect(rows[rows.length - 1]!.runningBalance).toBe('10000.000');
    });

    it('continues the running balance onto a second page instead of restarting it', async () => {
      const filters = { warehouseId: warehouse.id, brickTypeId: classOne.id };

      const whole = await register(fx.tokenA, { ...filters, limit: '50' }).expect(200);
      const page2 = await register(fx.tokenA, { ...filters, limit: '2', page: '2' }).expect(200);

      // Rows 3 and 4 of the newest-first list, with the balances they had there.
      expect(registerRowsOf(page2).map((r) => [r.id, r.runningBalance])).toEqual(
        registerRowsOf(whole)
          .slice(2, 4)
          .map((r) => [r.id, r.runningBalance]),
      );
      // Concretely: the sale leaves 30,000 behind, not a balance starting from zero.
      expect(registerRowsOf(page2)[0]!.runningBalance).toBe('30000.000');
    });

    it('keeps the running balance right when several movements share one date', async () => {
      // Same-date rows are ordered by created_at, so the balance carried into a
      // page has to break the tie the same way the page ordering does.
      const sameDay = await ds
        .getRepository(BrickType)
        .save(ds.getRepository(BrickType).create({ companyId: fx.companyA.id, grade: 'Same Day' }));
      for (const qty of ['100', '200', '300', '400']) {
        await move({ brickTypeId: sameDay.id }, 'production', 'in', qty, '2026-08-01');
      }

      const filters = { warehouseId: warehouse.id, brickTypeId: sameDay.id };
      const whole = await register(fx.tokenA, { ...filters, limit: '50' }).expect(200);
      expect(registerRowsOf(whole).map((r) => r.runningBalance)).toEqual(['1000.000', '600.000', '300.000', '100.000']);

      // Every page must agree with the whole list. Page 1 is the telling one:
      // its oldest row has two same-date rows before it, which the carried
      // balance has to include.
      for (const page of ['1', '2']) {
        const paged = await register(fx.tokenA, { ...filters, limit: '2', page }).expect(200);
        const offset = (Number(page) - 1) * 2;
        expect(registerRowsOf(paged).map((r) => [r.id, r.runningBalance])).toEqual(
          registerRowsOf(whole)
            .slice(offset, offset + 2)
            .map((r) => [r.id, r.runningBalance]),
        );
      }
    });

    it('leaves the running balance out when it would mean nothing', async () => {
      // Across different items in different yards a running total is nonsense.
      const res = await register(fx.tokenA, { limit: '50' }).expect(200);
      expect(registerRowsOf(res).every((r) => r.runningBalance === null)).toBe(true);
    });

    it('shows company B none of company A movements', async () => {
      const res = await register(fx.tokenB).expect(200);
      expect(metaOf(res).total).toBe(0);
    });

    it('rejects a request with no bearer token', async () => {
      await request(fx.app.getHttpServer()).get('/api/v1/stock/current').expect(401);
    });
  });
});
