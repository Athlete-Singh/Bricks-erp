import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';
import { seedRbac } from '../src/database/seeds/seed-rbac';
import { Company } from '../src/modules/company/entities/company.entity';
import { User } from '../src/modules/auth/entities/user.entity';
import { UserCompany } from '../src/modules/auth/entities/user-company.entity';
import { Role } from '../src/modules/auth/entities/role.entity';
import { Site } from '../src/modules/company/entities/site.entity';

jest.setTimeout(30000);

describe('Inventory Masters (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let company: Company;
  let site: Site;
  let token: string;

  const PASSWORD = 'inventory-pw';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();

    dataSource = app.get(DataSource);
    await dataSource.transaction((manager) => seedRbac(manager));
    const ownerRole = await dataSource.getRepository(Role).findOneByOrFail({ code: 'owner' });

    const companyRepo = dataSource.getRepository(Company);
    company = await companyRepo.save(companyRepo.create({ name: 'Inventory Test Co', stateCode: '09' }));

    const siteRepo = dataSource.getRepository(Site);
    site = await siteRepo.save(siteRepo.create({ companyId: company.id, code: 'MAIN', name: 'Main Site' }));

    const userRepo = dataSource.getRepository(User);
    const membershipRepo = dataSource.getRepository(UserCompany);
    const passwordHash = await bcrypt.hash(PASSWORD, 10);

    const owner = await userRepo.save(
      userRepo.create({ email: 'owner@inventory.test', mobile: '9200000001', name: 'Inv Owner', passwordHash }),
    );
    await membershipRepo.save(
      membershipRepo.create({ userId: owner.id, companyId: company.id, roleId: ownerRole.id, isDefault: true }),
    );

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ emailOrMobile: 'owner@inventory.test', password: PASSWORD })
      .expect(200);
    token = (loginRes.body as { data: { accessToken: string } }).data.accessToken;
  });

  afterAll(async () => {
    await dataSource.query(`
      DELETE FROM "items" WHERE "company_id" = '${company.id}';
      DELETE FROM "warehouses" WHERE "company_id" = '${company.id}';
      DELETE FROM "brick_types" WHERE "company_id" = '${company.id}';
      DELETE FROM "units" WHERE "company_id" = '${company.id}';
      DELETE FROM "sites" WHERE "company_id" = '${company.id}';
      DELETE FROM "user_companies" WHERE "user_id" IN (SELECT id FROM "users" WHERE "email" = 'owner@inventory.test');
      DELETE FROM "users" WHERE "email" = 'owner@inventory.test';
      DELETE FROM "audit_logs" WHERE "company_id" = '${company.id}';
      DELETE FROM "companies" WHERE "id" = '${company.id}';
    `);
    await app.close();
  });

  const api = (method: 'get' | 'post' | 'patch', path: string) =>
    request(app.getHttpServer())[method](`/api/v1/inventory${path}`).set('Authorization', `Bearer ${token}`);

  describe('Units', () => {
    it('creates a unit', async () => {
      const res = await api('post', '/units').send({ name: 'Pieces', abbreviation: 'pcs' }).expect(201);

      const body = res.body as { data: { id: string; name: string } };
      expect(body.data).toHaveProperty('id');
      expect(body.data.name).toBe('Pieces');
    });

    it('lists units', async () => {
      const res = await api('get', '/units').expect(200);
      const body = res.body as { data: { name: string }[] };

      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data[0]).toHaveProperty('name', 'Pieces');
    });
  });

  describe('Brick Types', () => {
    it('creates a brick type', async () => {
      const res = await api('post', '/brick-types').send({ grade: 'A1', description: 'Premium grade' }).expect(201);

      const body = res.body as { data: { id: string; grade: string } };
      expect(body.data).toHaveProperty('id');
      expect(body.data.grade).toBe('A1');
    });
  });

  describe('Warehouses', () => {
    it('creates a warehouse', async () => {
      const res = await api('post', '/warehouses').send({ name: 'Main Yard', siteId: site.id }).expect(201);

      const body = res.body as { data: { id: string; name: string } };
      expect(body.data).toHaveProperty('id');
      expect(body.data.name).toBe('Main Yard');
    });
  });

  describe('Items', () => {
    it('creates an item', async () => {
      const unitRes = await api('post', '/units').send({ name: 'Kilograms', abbreviation: 'kg' }).expect(201);

      const unitId = (unitRes.body as { data: { id: string } }).data.id;

      const res = await api('post', '/items').send({ name: 'Coal', category: 'raw_material', unitId }).expect(201);

      const body = res.body as { data: { id: string; name: string; category: string } };
      expect(body.data).toHaveProperty('id');
      expect(body.data.name).toBe('Coal');
      expect(body.data.category).toBe('raw_material');
    });
  });
});
