import request from 'supertest';
import { createTenantFixture, type TenantFixture } from './helpers/tenant-fixture';

jest.setTimeout(30000);

/** LAB-03 — piece rates per activity and the daily wage, configured per company. */
describe('Labour masters (e2e)', () => {
  let fx: TenantFixture;
  const url = '/api/v1/labour/wage-rates';

  const post = (token: string, body: Record<string, unknown>) =>
    request(fx.app.getHttpServer()).post(url).set('Authorization', `Bearer ${token}`).send(body);
  const list = (token: string) => request(fx.app.getHttpServer()).get(url).set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    fx = await createTenantFixture({
      prefix: 'Labour Test',
      domain: 'labour.test',
      tables: ['labour_wage_rates'],
      mobilePrefix: '910000003',
    });
  });

  afterAll(async () => {
    await fx.close();
  });

  describe('create and read', () => {
    it('creates a piece rate and returns the amount as a decimal string', async () => {
      const response = await post(fx.tokenA, {
        activity: 'making',
        unit: '1000 bricks',
        rateAmount: '650',
      }).expect(201);

      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.activity).toBe('making');
      // NUMERIC(18,2) round-trips as a decimal string, never a float.
      expect(response.body.data.rateAmount).toBe('650.00');
    });

    it('creates a daily wage', async () => {
      const response = await post(fx.tokenA, {
        activity: 'daily_wage',
        unit: 'day',
        rateAmount: '450.50',
      }).expect(201);
      expect(response.body.data.rateAmount).toBe('450.50');
    });

    it('lists the rates of the calling company, paginated', async () => {
      const response = await list(fx.tokenA).expect(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      expect(response.body.meta).toMatchObject({ page: 1, total: expect.any(Number) });
    });

    it('refuses a second rate for the same activity and unit', async () => {
      // Two rates for "making per 1000 bricks" would make the payout ambiguous.
      const res = await post(fx.tokenA, { activity: 'making', unit: '1000 bricks', rateAmount: '700' });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_VALUE');
    });

    it('updates a rate and keeps the decimal shape', async () => {
      const created = await post(fx.tokenA, {
        activity: 'loading',
        unit: '1000 bricks',
        rateAmount: '120',
      }).expect(201);

      const updated = await request(fx.app.getHttpServer())
        .patch(`${url}/${created.body.data.id}`)
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .send({ rateAmount: '135' })
        .expect(200);

      expect(updated.body.data.rateAmount).toBe('135.00');
    });
  });

  describe('validation', () => {
    it('rejects a zero rate', async () => {
      const response = await post(fx.tokenA, {
        activity: 'unloading',
        unit: '1000 bricks',
        rateAmount: '0',
      }).expect(400);
      expect(response.body.error.details).toBeDefined();
    });

    it('rejects an activity outside the allowed set', async () => {
      await post(fx.tokenA, { activity: 'dancing', unit: 'day', rateAmount: '100' }).expect(400);
    });

    it('rejects a rate that is not a number', async () => {
      await post(fx.tokenA, { activity: 'making', unit: 'day', rateAmount: 'six hundred' }).expect(400);
    });
  });

  describe('tenant isolation', () => {
    it('does not show company A rates to company B', async () => {
      const response = await list(fx.tokenB).expect(200);
      expect(response.body.data).toHaveLength(0);
    });

    it('refuses to update a rate belonging to another company', async () => {
      const created = await post(fx.tokenA, {
        activity: 'unloading',
        unit: '1000 bricks',
        rateAmount: '110',
      }).expect(201);

      await request(fx.app.getHttpServer())
        .patch(`${url}/${created.body.data.id}`)
        .set('Authorization', `Bearer ${fx.tokenB}`)
        .send({ rateAmount: '1' })
        .expect(404);
    });

    it('rejects a request with no bearer token', async () => {
      await request(fx.app.getHttpServer()).get(url).expect(401);
    });
  });
});
