/* eslint-disable @typescript-eslint/unbound-method */
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager, type Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { CreatePartyDto, UpdatePartyDto } from '@brics/shared';
import { AuditService } from '../../audit/audit.service';
import { LedgerGroup } from '../../../accounting/entities/ledger-group.entity';
import { Ledger } from '../../../accounting/entities/ledger.entity';
import { Party } from '../entities/party.entity';
import { PartyService, ledgerGroupCodeForTypes } from '../party.service';

const COMPANY_ID = 'c-111';
const USER_ID = 'u-222';

function makeGroup(code: string, id = `g-${code}`): LedgerGroup {
  return {
    id,
    companyId: COMPANY_ID,
    code,
    name: code,
    nature: 'liability',
    isDirect: false,
    isSystem: true,
    parentId: null,
  } as LedgerGroup;
}

function makeParty(overrides: Partial<Party> & { name: string; partyTypes: string[]; ledgerId: string }): Party {
  return {
    id: 'p-1',
    companyId: COMPANY_ID,
    gstin: null,
    pan: null,
    stateCode: null,
    address: null,
    phone: null,
    email: null,
    openingDebit: '0.00',
    openingCredit: '0.00',
    isActive: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: USER_ID,
    updatedBy: USER_ID,
    ...overrides,
  };
}

describe('ledgerGroupCodeForTypes', () => {
  it('picks Sundry Debtors for a customer', () => {
    expect(ledgerGroupCodeForTypes(['customer'])).toBe('SUNDRY_DEBTORS');
  });

  it('picks Sundry Creditors for a supplier', () => {
    expect(ledgerGroupCodeForTypes(['supplier'])).toBe('SUNDRY_CREDITORS');
  });

  it('picks Labour Payables for a Sardar', () => {
    expect(ledgerGroupCodeForTypes(['sardar'])).toBe('LABOUR_PAYABLES');
  });

  it('picks Labour Payables for an employee', () => {
    expect(ledgerGroupCodeForTypes(['employee'])).toBe('LABOUR_PAYABLES');
  });

  it('picks Sundry Creditors for a transporter', () => {
    expect(ledgerGroupCodeForTypes(['transporter'])).toBe('SUNDRY_CREDITORS');
  });

  it('picks Sundry Creditors for other', () => {
    expect(ledgerGroupCodeForTypes(['other'])).toBe('SUNDRY_CREDITORS');
  });

  it('picks Sundry Debtors when customer+supplier (customer wins by precedence)', () => {
    expect(ledgerGroupCodeForTypes(['supplier', 'customer'])).toBe('SUNDRY_DEBTORS');
  });

  it('picks Sundry Creditors when supplier+sardar (supplier wins by precedence)', () => {
    expect(ledgerGroupCodeForTypes(['sardar', 'supplier'])).toBe('SUNDRY_CREDITORS');
  });
});

describe('PartyService', () => {
  let service: PartyService;
  let partyRepo: jest.Mocked<Repository<Party>>;
  let groupRepo: jest.Mocked<Repository<LedgerGroup>>;
  let ledgerRepo: jest.Mocked<Repository<Ledger>>;
  let audit: jest.Mocked<AuditService>;
  let dataSource: jest.Mocked<DataSource>;

  const mockRepo = {
    create: jest.fn((data: unknown) => data),
    save: jest.fn((entity: unknown) => Promise.resolve({ id: `saved-${Date.now()}`, ...(entity as object) })),
    update: jest.fn(() => Promise.resolve()),
  };
  const mockManager = {
    getRepository: jest.fn(() => mockRepo),
  } as unknown as EntityManager;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PartyService,
        { provide: getRepositoryToken(Party), useValue: { findOne: jest.fn(), createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(LedgerGroup), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(Ledger), useValue: { update: jest.fn() } },
        { provide: AuditService, useValue: { record: jest.fn() } },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn((fn: (manager: EntityManager) => Promise<unknown>) => fn(mockManager)),
          },
        },
      ],
    }).compile();

    service = module.get(PartyService);
    partyRepo = module.get(getRepositoryToken(Party));
    groupRepo = module.get(getRepositoryToken(LedgerGroup));
    ledgerRepo = module.get(getRepositoryToken(Ledger));
    audit = module.get(AuditService);
    dataSource = module.get(DataSource);
  });

  afterEach(() => jest.clearAllMocks());

  const baseDto: CreatePartyDto = {
    name: 'Acme Supplier',
    partyTypes: ['supplier'],
    gstin: null,
    pan: null,
    stateCode: null,
    address: null,
    phone: null,
    email: null,
    openingDebit: '0.00',
    openingCredit: '0.00',
  };

  describe('create', () => {
    it('creates a party and its ledger in one transaction', async () => {
      partyRepo.findOne.mockResolvedValue(null);
      groupRepo.findOne.mockResolvedValue(makeGroup('SUNDRY_CREDITORS'));

      const result = await service.create(COMPANY_ID, USER_ID, baseDto);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(mockRepo.save).toHaveBeenCalledTimes(2); // ledger + party
      expect(mockRepo.update).toHaveBeenCalledTimes(1); // link partyId on ledger
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ entityName: 'parties', action: 'CREATE' }),
        mockManager,
      );
      expect(result).toHaveProperty('name', 'Acme Supplier');
    });

    it('puts a customer ledger under Sundry Debtors', async () => {
      partyRepo.findOne.mockResolvedValue(null);
      const debtorsGroup = makeGroup('SUNDRY_DEBTORS', 'g-debtors');
      groupRepo.findOne.mockResolvedValue(debtorsGroup);

      await service.create(COMPANY_ID, USER_ID, { ...baseDto, name: 'Customer Co', partyTypes: ['customer'] });

      expect(groupRepo.findOne).toHaveBeenCalledWith({ where: { companyId: COMPANY_ID, code: 'SUNDRY_DEBTORS' } });
      const ledgerSaveCall = (mockRepo.save as jest.Mock).mock.calls[0][0];
      expect(ledgerSaveCall).toHaveProperty('groupId', 'g-debtors');
    });

    it('puts a Sardar ledger under Labour Payables', async () => {
      partyRepo.findOne.mockResolvedValue(null);
      const labourGroup = makeGroup('LABOUR_PAYABLES', 'g-labour');
      groupRepo.findOne.mockResolvedValue(labourGroup);

      await service.create(COMPANY_ID, USER_ID, { ...baseDto, name: 'Sardar Ji', partyTypes: ['sardar'] });

      expect(groupRepo.findOne).toHaveBeenCalledWith({ where: { companyId: COMPANY_ID, code: 'LABOUR_PAYABLES' } });
    });

    it('rejects a duplicate name', async () => {
      partyRepo.findOne.mockResolvedValue({ id: 'existing' } as Party);

      await expect(service.create(COMPANY_ID, USER_ID, baseDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('moves the ledger group when party types change precedence', async () => {
      const existing = makeParty({ name: 'Some Party', partyTypes: ['supplier'], ledgerId: 'l-1' });

      partyRepo.findOne.mockResolvedValue(existing);
      const debtorsGroup = makeGroup('SUNDRY_DEBTORS', 'g-debtors');
      groupRepo.findOne.mockResolvedValue(debtorsGroup);

      const partyRepoSave = jest.fn((p: Party) => Promise.resolve(p));
      (partyRepo as unknown as { save: jest.Mock }).save = partyRepoSave;

      await service.update(COMPANY_ID, USER_ID, 'p-1', { partyTypes: ['customer'] } as UpdatePartyDto);

      expect(ledgerRepo.update).toHaveBeenCalledWith(
        { id: 'l-1', companyId: COMPANY_ID },
        { groupId: 'g-debtors', updatedBy: USER_ID },
      );
    });

    it('does not move the ledger when the group stays the same', async () => {
      const existing = makeParty({ name: 'Supplier A', partyTypes: ['supplier'], ledgerId: 'l-1' });

      partyRepo.findOne.mockResolvedValue(existing);
      const partyRepoSave = jest.fn((p: Party) => Promise.resolve(p));
      (partyRepo as unknown as { save: jest.Mock }).save = partyRepoSave;

      await service.update(COMPANY_ID, USER_ID, 'p-1', { partyTypes: ['transporter'] } as UpdatePartyDto);

      // Both supplier and transporter map to SUNDRY_CREDITORS
      expect(ledgerRepo.update).not.toHaveBeenCalled();
    });

    it('renames the ledger when the party name changes', async () => {
      const existing = makeParty({ name: 'Old Name', partyTypes: ['customer'], ledgerId: 'l-1' });

      partyRepo.findOne
        .mockResolvedValueOnce(existing) // requireParty
        .mockResolvedValueOnce(null); // duplicate check

      const partyRepoSave = jest.fn((p: Party) => Promise.resolve(p));
      (partyRepo as unknown as { save: jest.Mock }).save = partyRepoSave;

      await service.update(COMPANY_ID, USER_ID, 'p-1', { name: 'New Name' } as UpdatePartyDto);

      expect(ledgerRepo.update).toHaveBeenCalledWith(
        { id: 'l-1', companyId: COMPANY_ID },
        { name: 'New Name', updatedBy: USER_ID },
      );
    });

    it('throws NotFoundException for a missing party', async () => {
      partyRepo.findOne.mockResolvedValue(null);

      await expect(service.update(COMPANY_ID, USER_ID, 'missing', {} as UpdatePartyDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
