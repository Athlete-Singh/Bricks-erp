import request from 'supertest';
import { createTenantFixture, type TenantFixture } from './helpers/tenant-fixture';

jest.setTimeout(30000);

/** GST-01 — HSN/SAC master with its GST rates. Rates are per company (ADR-018). */
describe('Taxes masters (e2e)', () => {
  let fx: TenantFixture;
  const url = '/api/v1/taxes/hsn-rates';

  const post = (token: string, body: Record<string, unknown>) =>
    request(fx.app.getHttpServer()).post(url).set('Authorization', `Bearer ${token}`).send(body);
  const list = (token: string) => request(fx.app.getHttpServer()).get(url).set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    fx = await createTenantFixture({
      prefix: 'Taxes Test',
      domain: 'taxes.test',
      tables: ['tax_hsn_rates'],
      mobilePrefix: '910000002',
    });
  });

  afterAll(async () => {
    await fx.close();
  });

  describe('create and read', () => {
    it('creates an HSN rate and returns the rates as decimal strings', async () => {
      const response = await post(fx.tokenA, {
        hsnCode: '6904',
        description: 'Clay building bricks',
        cgstRate: '6',
        sgstRate: '6',
        igstRate: '12',
      }).expect(201);

      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.hsnCode).toBe('6904');
      // Never a float: these feed GST calculations where 0.1 + 0.2 must be 0.3.
      expect(response.body.data.cgstRate).toBe('6.00');
      expect(response.body.data.igstRate).toBe('12.00');
    });

    it('defaults the rates to zero when they are omitted', async () => {
      const response = await post(fx.tokenA, { hsnCode: '9999' }).expect(201);
      expect(response.body.data.cgstRate).toBe('0.00');
      expect(response.body.data.sgstRate).toBe('0.00');
      expect(response.body.data.igstRate).toBe('0.00');
    });

    it('lists the rates of the calling company', async () => {
      const response = await list(fx.tokenA).expect(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('updates a rate', async () => {
      const created = await post(fx.tokenA, { hsnCode: '6905', igstRate: '12' }).expect(201);

      const updated = await request(fx.app.getHttpServer())
        .patch(`${url}/${created.body.data.id}`)
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .send({ igstRate: '18', description: 'Revised by notification' })
        .expect(200);

      expect(updated.body.data.igstRate).toBe('18.00');
      expect(updated.body.data.description).toBe('Revised by notification');
    });
  });

  describe('validation', () => {
    it('rejects a rate above 100 with a 400, not a 500', async () => {
      const response = await post(fx.tokenA, { hsnCode: '6906', igstRate: '101' }).expect(400);
      expect(response.body.error.details).toBeDefined();
    });

    it('rejects a non-numeric rate', async () => {
      await post(fx.tokenA, { hsnCode: '6907', igstRate: 'twelve' }).expect(400);
    });

    it('rejects an empty HSN code', async () => {
      await post(fx.tokenA, { hsnCode: '' }).expect(400);
    });
  });

  describe('tenant isolation', () => {
    it('does not show company A rates to company B', async () => {
      const response = await list(fx.tokenB).expect(200);
      const codes = (response.body.data as { hsnCode: string }[]).map((r) => r.hsnCode);
      expect(codes).not.toContain('6904');
    });

    it('refuses to update a rate belonging to another company', async () => {
      const created = await post(fx.tokenA, { hsnCode: '7001' }).expect(201);

      await request(fx.app.getHttpServer())
        .patch(`${url}/${created.body.data.id}`)
        .set('Authorization', `Bearer ${fx.tokenB}`)
        .send({ igstRate: '28' })
        .expect(404);
    });

    it('rejects a request with no bearer token', async () => {
      await request(fx.app.getHttpServer()).get(url).expect(401);
    });
  });
});
