import request from 'supertest';
import { Site } from '../src/modules/company/entities/site.entity';
import { createTenantFixture, type TenantFixture } from './helpers/tenant-fixture';

jest.setTimeout(30000);

/** INV-01 / INV-02 / PRD-01 — units, items, brick grades and warehouses, per company. */
describe('Inventory masters (e2e)', () => {
  let fx: TenantFixture;
  let siteA: Site;
  let siteB: Site;

  const api = (method: 'get' | 'post' | 'patch', path: string, token: string) =>
    request(fx.app.getHttpServer())[method](`/api/v1/inventory${path}`).set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    fx = await createTenantFixture({
      prefix: 'Inventory Test',
      domain: 'inventory.test',
      // Children first: items reference units, warehouses reference sites.
      tables: ['items', 'warehouses', 'brick_types', 'units', 'tax_hsn_rates', 'sites'],
      mobilePrefix: '910000005',
    });

    const siteRepo = fx.dataSource.getRepository(Site);
    siteA = await siteRepo.save(siteRepo.create({ companyId: fx.companyA.id, name: 'Kiln A', code: 'KA' }));
    siteB = await siteRepo.save(siteRepo.create({ companyId: fx.companyB.id, name: 'Kiln B', code: 'KB' }));
  });

  afterAll(async () => {
    await fx.close();
  });

  describe('units', () => {
    it('creates a unit', async () => {
      const res = await api('post', '/units', fx.tokenA).send({ name: 'Pieces', abbreviation: 'pcs' }).expect(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.name).toBe('Pieces');
    });

    it('lists units, paginated', async () => {
      const res = await api('get', '/units', fx.tokenA).expect(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      // CONVENTIONS: every list carries `meta` so a page can be requested.
      expect(res.body.meta).toMatchObject({ page: 1, total: expect.any(Number) });
    });

    it('updates a unit', async () => {
      const created = await api('post', '/units', fx.tokenA)
        .send({ name: 'Quintals', abbreviation: 'qtl' })
        .expect(201);

      const updated = await api('patch', `/units/${created.body.data.id}`, fx.tokenA)
        .send({ abbreviation: 'q' })
        .expect(200);

      expect(updated.body.data.abbreviation).toBe('q');
    });

    it('rejects an abbreviation longer than the column', async () => {
      const res = await api('post', '/units', fx.tokenA)
        .send({ name: 'Too long', abbreviation: 'abcdefghijk' })
        .expect(400);
      expect(res.body.error.details).toBeDefined();
    });
  });

  describe('duplicates', () => {
    it('refuses a second unit with the same name, as a 409 and not a 500', async () => {
      await api('post', '/units', fx.tokenA).send({ name: 'Bags', abbreviation: 'bag' }).expect(201);
      // Case-insensitive: "Bags" and "bags" are the same unit to a storekeeper.
      const res = await api('post', '/units', fx.tokenA).send({ name: 'bags', abbreviation: 'bg' });
      expect(res.status).toBe(409);
    });

    it('refuses a second brick grade with the same name', async () => {
      await api('post', '/brick-types', fx.tokenA).send({ grade: 'Jhama' }).expect(201);
      const res = await api('post', '/brick-types', fx.tokenA).send({ grade: 'jhama' });
      expect(res.status).toBe(409);
    });

    it('lets another company use the same unit name', async () => {
      await api('post', '/units', fx.tokenB).send({ name: 'Bags', abbreviation: 'bag' }).expect(201);
    });
  });

  describe('brick types', () => {
    it('creates a brick grade', async () => {
      const res = await api('post', '/brick-types', fx.tokenA)
        .send({ grade: 'A1', description: 'Premium grade' })
        .expect(201);
      expect(res.body.data.grade).toBe('A1');
    });

    it('accepts a grade with no description', async () => {
      const res = await api('post', '/brick-types', fx.tokenA).send({ grade: 'B2' }).expect(201);
      expect(res.body.data.description).toBeNull();
    });

    it('rejects an empty grade', async () => {
      await api('post', '/brick-types', fx.tokenA).send({ grade: '' }).expect(400);
    });
  });

  describe('warehouses', () => {
    it('creates a warehouse against a kiln of the calling company', async () => {
      const res = await api('post', '/warehouses', fx.tokenA).send({ name: 'Main Yard', siteId: siteA.id }).expect(201);
      expect(res.body.data.name).toBe('Main Yard');
      expect(res.body.data.siteId).toBe(siteA.id);
    });

    it('refuses a warehouse pointed at another company kiln', async () => {
      // Without this check a tenant could attach stock to a kiln it does not own.
      const res = await api('post', '/warehouses', fx.tokenA).send({ name: 'Smuggled', siteId: siteB.id });
      expect([400, 404, 422]).toContain(res.status);
    });

    it('rejects a siteId that is not a uuid', async () => {
      await api('post', '/warehouses', fx.tokenA).send({ name: 'Bad', siteId: 'nope' }).expect(400);
    });
  });

  describe('items', () => {
    it('creates an item against a unit', async () => {
      const unit = await api('post', '/units', fx.tokenA).send({ name: 'Kilograms', abbreviation: 'kg' }).expect(201);

      const res = await api('post', '/items', fx.tokenA)
        .send({ name: 'Coal', category: 'raw_material', unitId: unit.body.data.id })
        .expect(201);

      expect(res.body.data.name).toBe('Coal');
      expect(res.body.data.category).toBe('raw_material');
      expect(res.body.data.hsnId).toBeNull();
    });

    it('rejects an unknown category', async () => {
      const unit = await api('post', '/units', fx.tokenA).send({ name: 'Litres', abbreviation: 'L' }).expect(201);

      await api('post', '/items', fx.tokenA)
        .send({ name: 'Diesel', category: 'fuel', unitId: unit.body.data.id })
        .expect(400);
    });
  });

  describe('tenant isolation', () => {
    it('does not show company A masters to company B', async () => {
      // B has one unit of its own (from the duplicate-name test), so assert on
      // what it must NOT see rather than on an empty list.
      const unitNames = ((await api('get', '/units', fx.tokenB).expect(200)).body.data as { name: string }[]).map(
        (u) => u.name,
      );
      expect(unitNames).not.toContain('Pieces');
      expect(unitNames).not.toContain('Kilograms');

      expect((await api('get', '/brick-types', fx.tokenB).expect(200)).body.data).toHaveLength(0);
      expect((await api('get', '/warehouses', fx.tokenB).expect(200)).body.data).toHaveLength(0);
      expect((await api('get', '/items', fx.tokenB).expect(200)).body.data).toHaveLength(0);
    });

    it('refuses to update another company unit', async () => {
      const created = await api('post', '/units', fx.tokenA)
        .send({ name: 'Protected', abbreviation: 'prt' })
        .expect(201);

      await api('patch', `/units/${created.body.data.id}`, fx.tokenB).send({ name: 'Hijacked' }).expect(404);
    });

    it('refuses to update another company brick type', async () => {
      const created = await api('post', '/brick-types', fx.tokenA).send({ grade: 'Protected' }).expect(201);
      await api('patch', `/brick-types/${created.body.data.id}`, fx.tokenB).send({ grade: 'X' }).expect(404);
    });

    it('refuses an item pointed at another company HSN rate', async () => {
      const foreignHsn = await request(fx.app.getHttpServer())
        .post('/api/v1/taxes/hsn-rates')
        .set('Authorization', `Bearer ${fx.tokenB}`)
        .send({ hsnCode: '6904', igstRate: '12' })
        .expect(201);

      const unit = await api('post', '/units', fx.tokenA).send({ name: 'Tonnes', abbreviation: 't' }).expect(201);

      await api('post', '/items', fx.tokenA)
        .send({ name: 'Smuggled', category: 'raw_material', unitId: unit.body.data.id, hsnId: foreignHsn.body.data.id })
        .expect(404);
    });

    it('rejects a request with no bearer token', async () => {
      await request(fx.app.getHttpServer()).get('/api/v1/inventory/units').expect(401);
    });
  });
});
