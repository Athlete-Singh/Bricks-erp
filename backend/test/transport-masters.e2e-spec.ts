import request from 'supertest';
import { createTenantFixture, type TenantFixture } from './helpers/tenant-fixture';

jest.setTimeout(30000);

/** VEH-01 — vehicles (own or hired) and the drivers who run them. */
describe('Transport masters (e2e)', () => {
  let fx: TenantFixture;
  const drivers = '/api/v1/transport/drivers';
  const vehicles = '/api/v1/transport/vehicles';

  const post = (url: string, token: string, body: Record<string, unknown>) =>
    request(fx.app.getHttpServer()).post(url).set('Authorization', `Bearer ${token}`).send(body);
  const list = (url: string, token: string) =>
    request(fx.app.getHttpServer()).get(url).set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    fx = await createTenantFixture({
      prefix: 'Transport Test',
      domain: 'transport.test',
      // Vehicles reference parties, drivers stand alone; neither references the other.
      tables: ['transport_vehicles', 'transport_drivers'],
      mobilePrefix: '910000004',
    });
  });

  afterAll(async () => {
    await fx.close();
  });

  describe('drivers', () => {
    it('creates a driver', async () => {
      const response = await post(drivers, fx.tokenA, {
        name: 'Ramesh Kumar',
        phone: '9876543210',
        licenseNo: 'UP32-2019-0001234',
      }).expect(201);

      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.name).toBe('Ramesh Kumar');
      expect(response.body.data.isActive).toBe(true);
    });

    it('creates a driver with no phone or licence yet', async () => {
      const response = await post(drivers, fx.tokenA, { name: 'Suresh' }).expect(201);
      expect(response.body.data.phone).toBeNull();
      expect(response.body.data.licenseNo).toBeNull();
    });

    it('lists the drivers of the calling company, paginated', async () => {
      const response = await list(drivers, fx.tokenA).expect(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      expect(response.body.meta).toMatchObject({ page: 1, total: expect.any(Number) });
    });

    it('updates a driver and can deactivate one', async () => {
      const created = await post(drivers, fx.tokenA, { name: 'Temporary Driver' }).expect(201);

      const updated = await request(fx.app.getHttpServer())
        .patch(`${drivers}/${created.body.data.id}`)
        .set('Authorization', `Bearer ${fx.tokenA}`)
        .send({ phone: '9000000000', isActive: false })
        .expect(200);

      expect(updated.body.data.phone).toBe('9000000000');
      expect(updated.body.data.isActive).toBe(false);
    });

    it('rejects a driver with no name', async () => {
      const response = await post(drivers, fx.tokenA, { name: '' }).expect(400);
      expect(response.body.error.details).toBeDefined();
    });
  });

  describe('vehicles', () => {
    it('creates an owned truck', async () => {
      const response = await post(vehicles, fx.tokenA, {
        registrationNo: 'UP32 AB 1234',
        type: 'truck',
        ownerType: 'own',
      }).expect(201);

      expect(response.body.data.registrationNo).toBe('UP32 AB 1234');
      expect(response.body.data.ownerType).toBe('own');
      expect(response.body.data.partyId).toBeNull();
    });

    it('creates a hired tractor', async () => {
      const response = await post(vehicles, fx.tokenA, {
        registrationNo: 'UP32 CD 5678',
        type: 'tractor',
        ownerType: 'hired',
      }).expect(201);
      expect(response.body.data.type).toBe('tractor');
    });

    it('lists the vehicles of the calling company', async () => {
      const response = await list(vehicles, fx.tokenA).expect(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('refuses a second vehicle with the same registration number', async () => {
      // Case-insensitive: a number plate is the same plate however it is typed.
      const res = await post(vehicles, fx.tokenA, {
        registrationNo: 'up32 ab 1234',
        type: 'truck',
        ownerType: 'own',
      });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_VALUE');
    });

    it('rejects an unknown vehicle type', async () => {
      await post(vehicles, fx.tokenA, {
        registrationNo: 'UP32 XX 0001',
        type: 'helicopter',
        ownerType: 'own',
      }).expect(400);
    });

    it('rejects a partyId that is not a uuid', async () => {
      await post(vehicles, fx.tokenA, {
        registrationNo: 'UP32 XX 0002',
        type: 'truck',
        ownerType: 'hired',
        partyId: 'not-a-uuid',
      }).expect(400);
    });
  });

  describe('tenant isolation', () => {
    it('does not show company A drivers or vehicles to company B', async () => {
      expect((await list(drivers, fx.tokenB).expect(200)).body.data).toHaveLength(0);
      expect((await list(vehicles, fx.tokenB).expect(200)).body.data).toHaveLength(0);
    });

    it('refuses to update another company driver', async () => {
      const created = await post(drivers, fx.tokenA, { name: 'Protected Driver' }).expect(201);

      await request(fx.app.getHttpServer())
        .patch(`${drivers}/${created.body.data.id}`)
        .set('Authorization', `Bearer ${fx.tokenB}`)
        .send({ name: 'Hijacked' })
        .expect(404);
    });

    it('refuses to update another company vehicle', async () => {
      const created = await post(vehicles, fx.tokenA, {
        registrationNo: 'UP32 ZZ 9999',
        type: 'tipper',
        ownerType: 'own',
      }).expect(201);

      await request(fx.app.getHttpServer())
        .patch(`${vehicles}/${created.body.data.id}`)
        .set('Authorization', `Bearer ${fx.tokenB}`)
        .send({ registrationNo: 'HIJACKED' })
        .expect(404);
    });

    it('rejects requests with no bearer token', async () => {
      await request(fx.app.getHttpServer()).get(drivers).expect(401);
      await request(fx.app.getHttpServer()).get(vehicles).expect(401);
    });
  });
});
