/* eslint-disable @typescript-eslint/unbound-method */
import { Test } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, type Repository } from 'typeorm';
import type { CreateTenantDto } from '@brics/shared';
import { AuditService } from '../../audit/audit.service';
import { ChartOfAccountsService } from '../../../accounting/chart-of-accounts.service';
import { MembershipService } from '../../auth/membership.service';
import { RolesService } from '../../auth/roles.service';
import { User } from '../../auth/entities/user.entity';
import { Company } from '../../company/entities/company.entity';
import { PlatformService, defaultIndianFinancialYear } from '../platform.service';

const ACTOR_ID = 'actor-platform-admin';

describe('defaultIndianFinancialYear', () => {
  it('picks the current FY for a date in July', () => {
    expect(defaultIndianFinancialYear(new Date('2026-07-15T00:00:00Z'))).toEqual({
      name: '2026-27',
      startDate: '2026-04-01',
      endDate: '2027-03-31',
    });
  });

  it('picks the previous FY for a date in February (before 1 April)', () => {
    expect(defaultIndianFinancialYear(new Date('2026-02-10T00:00:00Z'))).toEqual({
      name: '2025-26',
      startDate: '2025-04-01',
      endDate: '2026-03-31',
    });
  });

  it('rolls over on 1 April', () => {
    expect(defaultIndianFinancialYear(new Date('2026-04-01T00:00:00Z'))).toEqual({
      name: '2026-27',
      startDate: '2026-04-01',
      endDate: '2027-03-31',
    });
  });
});

describe('PlatformService', () => {
  let service: PlatformService;
  let companyRepo: jest.Mocked<Repository<Company>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let roles: jest.Mocked<RolesService>;
  let membership: jest.Mocked<MembershipService>;
  let chart: jest.Mocked<ChartOfAccountsService>;
  let audit: jest.Mocked<AuditService>;
  let dataSource: jest.Mocked<DataSource>;

  // The transaction manager hands back a repo whose save returns the entity with
  // an id; this is what the service relies on to thread company.id through the
  // chart seed, FY creation and membership insert.
  const makeManager = () => {
    const save = jest.fn((entity: unknown) => Promise.resolve({ id: 'saved-id', ...(entity as object) }));
    const create = jest.fn((_type: unknown, data: unknown) => data);
    return {
      save,
      create,
      getRepository: jest.fn(() => ({
        findOne: jest.fn().mockResolvedValue(null),
        save,
        create,
      })),
    } as unknown as EntityManager;
  };

  const dto: CreateTenantDto = {
    companyName: 'Shri Ram Bricks',
    stateCode: '09',
    gstin: null,
    planName: 'starter',
    ownerName: 'Ramesh',
    ownerMobile: '9876543210',
    ownerEmail: 'ramesh@kiln.test',
    ownerPassword: 'correct-horse',
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PlatformService,
        { provide: getRepositoryToken(Company), useValue: { findOneBy: jest.fn(), find: jest.fn(), save: jest.fn() } },
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn() } },
        {
          provide: RolesService,
          useValue: { requireByCode: jest.fn().mockResolvedValue({ id: 'owner-role-id', code: 'owner' }) },
        },
        { provide: MembershipService, useValue: { addMembership: jest.fn() } },
        { provide: ChartOfAccountsService, useValue: { seedForCompany: jest.fn() } },
        { provide: AuditService, useValue: { record: jest.fn() } },
        {
          provide: getDataSourceToken(),
          useValue: {
            transaction: jest.fn((fn: (manager: EntityManager) => Promise<unknown>) => fn(makeManager())),
          },
        },
      ],
    }).compile();

    service = module.get(PlatformService);
    companyRepo = module.get(getRepositoryToken(Company));
    userRepo = module.get(getRepositoryToken(User));
    roles = module.get(RolesService);
    membership = module.get(MembershipService);
    chart = module.get(ChartOfAccountsService);
    audit = module.get(AuditService);
    dataSource = module.get(getDataSourceToken());
  });

  afterEach(() => jest.clearAllMocks());

  describe('createTenant (PLT-05)', () => {
    it('creates company, chart of accounts, first FY, owner user and membership in one transaction', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await service.createTenant(ACTOR_ID, dto);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(roles.requireByCode).toHaveBeenCalledWith('owner');
      expect(chart.seedForCompany).toHaveBeenCalledWith('saved-id', expect.anything());
      expect(membership.addMembership).toHaveBeenCalledWith(
        'saved-id',
        'saved-id',
        'owner-role-id',
        true,
        expect.anything(),
      );
      // One audit for the company, one for the owner user — both inside the txn.
      expect(audit.record).toHaveBeenCalledTimes(2);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ entityName: 'companies', action: 'CREATE' }),
        expect.anything(),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ entityName: 'users', action: 'CREATE' }),
        expect.anything(),
      );
    });

    it('starts the tenant in `active`, not `trial` — the vendor onboards paying kilns, trial comes with billing (S4)', async () => {
      userRepo.findOne.mockResolvedValue(null);
      let captured: Record<string, unknown> | undefined;
      const transaction = dataSource.transaction as unknown as jest.Mock;
      transaction.mockImplementation(async (fn: (manager: EntityManager) => Promise<unknown>) => {
        const manager = {
          save: jest.fn((entity: unknown) => {
            if (captured === undefined) captured = entity as Record<string, unknown>;
            return Promise.resolve({ id: 'saved-id', ...(entity as object) });
          }),
          create: jest.fn((_type: unknown, data: unknown) => data),
          getRepository: jest.fn(() => ({ findOne: jest.fn().mockResolvedValue(null) })),
        } as unknown as EntityManager;
        return fn(manager);
      });

      await service.createTenant(ACTOR_ID, dto);
      expect(captured).toMatchObject({ name: 'Shri Ram Bricks', status: 'active', planName: 'starter' });
    });

    it('refuses a mobile that already belongs to another user — before anything is written', async () => {
      userRepo.findOne.mockResolvedValueOnce({ id: 'existing-user' } as User);

      await expect(service.createTenant(ACTOR_ID, dto)).rejects.toThrow(ConflictException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('refuses an email that already belongs to another user — before anything is written', async () => {
      userRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'existing-user' } as User);

      await expect(service.createTenant(ACTOR_ID, dto)).rejects.toThrow(ConflictException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('suspendTenant (PLT-06)', () => {
    it('flips status to suspended and audits the change', async () => {
      const company = {
        id: 'tenant-1',
        status: 'active',
        name: 'Shri Ram Bricks',
        stateCode: '09',
        planName: null,
        trialEndsAt: null,
        lastActiveAt: null,
        createdAt: new Date('2026-01-01'),
      } as Company;
      companyRepo.findOneBy.mockResolvedValue(company);
      companyRepo.save.mockImplementation((c: unknown) => Promise.resolve(c as Company));

      const result = await service.suspendTenant(ACTOR_ID, 'tenant-1', 'late payment');

      expect(result.status).toBe('suspended');
      expect(companyRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'suspended' }));
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entityName: 'companies',
          action: 'UPDATE',
          before: { status: 'active' },
          after: expect.objectContaining({ status: 'suspended', reason: 'late payment' }),
        }),
      );
    });

    it('is idempotent — a second suspend writes no audit row', async () => {
      companyRepo.findOneBy.mockResolvedValue({
        id: 'tenant-1',
        status: 'suspended',
        name: 'Shri Ram Bricks',
        stateCode: '09',
        planName: null,
        trialEndsAt: null,
        lastActiveAt: null,
        createdAt: new Date('2026-01-01'),
      } as Company);
      companyRepo.save.mockImplementation((c: unknown) => Promise.resolve(c as Company));

      await service.suspendTenant(ACTOR_ID, 'tenant-1');
      expect(audit.record).not.toHaveBeenCalled();
      expect(companyRepo.save).not.toHaveBeenCalled();
    });

    it('throws when the tenant is unknown', async () => {
      companyRepo.findOneBy.mockResolvedValue(null);
      await expect(service.suspendTenant(ACTOR_ID, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('reactivateTenant', () => {
    it('flips status back to active and audits the change', async () => {
      companyRepo.findOneBy.mockResolvedValue({
        id: 'tenant-1',
        status: 'suspended',
        name: 'Shri Ram Bricks',
        stateCode: '09',
        planName: null,
        trialEndsAt: null,
        lastActiveAt: null,
        createdAt: new Date('2026-01-01'),
      } as Company);
      companyRepo.save.mockImplementation((c: unknown) => Promise.resolve(c as Company));

      const result = await service.reactivateTenant(ACTOR_ID, 'tenant-1');

      expect(result.status).toBe('active');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          before: { status: 'suspended' },
          after: expect.objectContaining({ status: 'active' }),
        }),
      );
    });
  });
});
