import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';
import { seedRbac } from '../src/database/seeds/seed-rbac';
import { DataSource } from 'typeorm';
import { Company } from '../src/modules/company/entities/company.entity';
import { User } from '../src/modules/auth/entities/user.entity';
import { UserCompany } from '../src/modules/auth/entities/user-company.entity';
import { Role } from '../src/modules/auth/entities/role.entity';

describe('WageRatesController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let companyId: string;

  const PASSWORD = 'labour-test-pw';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();

    dataSource = app.get(DataSource);

    await resetFixtures();
    await dataSource.transaction((manager) => seedRbac(manager));

    const ownerRole = await dataSource.getRepository(Role).findOneByOrFail({ code: 'owner' });
    const companyRepo = dataSource.getRepository(Company);
    const company = await companyRepo.save(companyRepo.create({ name: 'Labour Test Company', stateCode: '09' }));
    companyId = company.id;

    const userRepo = dataSource.getRepository(User);
    const membershipRepo = dataSource.getRepository(UserCompany);
    const passwordHash = await bcrypt.hash(PASSWORD, 10);

    const owner = await userRepo.save(
      userRepo.create({ email: 'owner@labour.test', mobile: '9100000013', name: 'Labour Owner', passwordHash }),
    );

    await membershipRepo.save(
      membershipRepo.create({ userId: owner.id, companyId: company.id, roleId: ownerRole.id, isDefault: true }),
    );

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ emailOrMobile: 'owner@labour.test', password: PASSWORD })
      .expect(200);

    adminToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await resetFixtures();
    await app.close();
  });

  async function resetFixtures(): Promise<void> {
    await dataSource.query(`
      DELETE FROM "labour_wage_rates" WHERE "company_id" IN (SELECT id FROM "companies" WHERE "name" LIKE 'Labour Test %');
      DELETE FROM "user_companies" WHERE "user_id" IN (SELECT id FROM "users" WHERE "email" LIKE '%@labour.test');
      DELETE FROM "refresh_tokens" WHERE "user_id" IN (SELECT id FROM "users" WHERE "email" LIKE '%@labour.test');
      DELETE FROM "users" WHERE "email" LIKE '%@labour.test';
      DELETE FROM "companies" WHERE "name" LIKE 'Labour Test %';
    `);
  }

  it('/labour/wage-rates (POST)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/labour/wage-rates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        activity: 'unloading',
        unit: '1000 bricks',
        rateAmount: 150.5,
        isActive: true,
      })
      .expect(201);

    expect(response.body.data.id).toBeDefined();
    expect(response.body.data.activity).toBe('unloading');
  });

  it('/labour/wage-rates (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/labour/wage-rates')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
  });
});
