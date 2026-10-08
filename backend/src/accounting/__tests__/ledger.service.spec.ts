import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BusinessRuleException } from '../../common/exceptions/business-rule.exception';
import { LedgerGroup } from '../entities/ledger-group.entity';
import { Ledger } from '../entities/ledger.entity';
import { LedgerService } from '../ledger.service';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const USER_ID = '22222222-2222-2222-2222-222222222222';
const FY_ID = '33333333-3333-3333-3333-333333333333';

const ledger = (overrides: Partial<Ledger> = {}): Ledger =>
  ({
    id: 'l1',
    companyId: COMPANY_ID,
    groupId: 'g1',
    name: 'Cash',
    code: 'CASH',
    partyId: null,
    openingDebit: '0.00',
    openingCredit: '0.00',
    openingFinancialYearId: null,
    isSystem: false,
    isActive: true,
    ...overrides,
  }) as Ledger;

const group = (overrides: Partial<LedgerGroup> = {}): LedgerGroup =>
  ({ id: 'g1', companyId: COMPANY_ID, code: 'CASH_IN_HAND', nature: 'asset', ...overrides }) as LedgerGroup;

describe('LedgerService', () => {
  let service: LedgerService;
  let ledgerRepo: { find: jest.Mock; findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let groupRepo: { findOne: jest.Mock };
  let updates: Array<Record<string, unknown>>;

  beforeEach(async () => {
    updates = [];
    ledgerRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((dto: unknown) => dto),
      save: jest.fn((dto: unknown) => Promise.resolve({ id: 'new', ...(dto as object) })),
    };
    groupRepo = { findOne: jest.fn().mockResolvedValue(group()) };

    const dataSource = {
      transaction: (cb: (m: unknown) => Promise<unknown>) =>
        cb({
          update: (_entity: unknown, _where: unknown, patch: Record<string, unknown>) => {
            updates.push(patch);
            return Promise.resolve();
          },
        }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LedgerService,
        { provide: getRepositoryToken(Ledger), useValue: ledgerRepo },
        { provide: getRepositoryToken(LedgerGroup), useValue: groupRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(LedgerService);
  });

  describe('create', () => {
    it('refuses a group from another company', async () => {
      // Scoped by companyId, so another tenant's group id simply is not found.
      groupRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create(COMPANY_ID, USER_ID, { name: 'Bank — HDFC', groupId: 'other-tenant-group', code: null }),
      ).rejects.toThrow(NotFoundException);
    });

    it('refuses a duplicate ledger name', async () => {
      ledgerRepo.findOne.mockResolvedValue(ledger({ name: 'Cash' }));

      await expect(service.create(COMPANY_ID, USER_ID, { name: 'Cash', groupId: 'g1', code: null })).rejects.toThrow(
        /already exists/,
      );
    });

    it('creates a ledger in the caller company', async () => {
      const created = await service.create(COMPANY_ID, USER_ID, { name: 'Bank — HDFC', groupId: 'g1', code: null });

      expect(created).toMatchObject({ companyId: COMPANY_ID, groupId: 'g1', name: 'Bank — HDFC' });
    });
  });

  describe('update', () => {
    it('will not move a built-in ledger to another group', async () => {
      // Posting rules find "Output CGST" by code and assume its group; moving it
      // would silently break the GST split.
      ledgerRepo.findOne.mockResolvedValue(ledger({ isSystem: true, name: 'Output CGST' }));
      groupRepo.findOne.mockResolvedValue(group({ id: 'g2', code: 'INDIRECT_EXPENSES', nature: 'expense' }));

      await expect(service.update(COMPANY_ID, USER_ID, 'l1', { groupId: 'g2' })).rejects.toThrow(BusinessRuleException);
    });

    it('will not deactivate a built-in ledger', async () => {
      ledgerRepo.findOne.mockResolvedValue(ledger({ isSystem: true, name: 'Cash' }));

      await expect(service.update(COMPANY_ID, USER_ID, 'l1', { isActive: false })).rejects.toThrow(
        /cannot be deactivated/,
      );
    });

    it('allows renaming a built-in ledger, which is the owner right', async () => {
      ledgerRepo.findOne.mockResolvedValueOnce(ledger({ isSystem: true, name: 'Cash' })).mockResolvedValueOnce(null);

      const saved = await service.update(COMPANY_ID, USER_ID, 'l1', { name: 'Cash in Hand' });

      expect(saved.name).toBe('Cash in Hand');
    });
  });

  describe('opening balances (ACC-04)', () => {
    it('refuses ledger ids that belong to another company', async () => {
      ledgerRepo.find.mockResolvedValue([ledger({ id: 'l1' })]);

      await expect(
        service.setOpeningBalances(COMPANY_ID, USER_ID, {
          financialYearId: FY_ID,
          balances: [{ ledgerId: 'l-from-another-tenant', openingDebit: '100.00', openingCredit: '0.00' }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('writes every balance and stamps the financial year', async () => {
      ledgerRepo.find.mockResolvedValue([ledger({ id: 'l1' }), ledger({ id: 'l2' })]);

      await service.setOpeningBalances(COMPANY_ID, USER_ID, {
        financialYearId: FY_ID,
        balances: [
          { ledgerId: 'l1', openingDebit: '1500.50', openingCredit: '0.00' },
          { ledgerId: 'l2', openingDebit: '0.00', openingCredit: '1500.50' },
        ],
      });

      expect(updates).toHaveLength(2);
      expect(updates[0]).toMatchObject({ openingDebit: '1500.50', openingFinancialYearId: FY_ID });
    });

    it('reports a balanced set as balanced', async () => {
      ledgerRepo.find.mockResolvedValue([
        ledger({ id: 'l1', openingDebit: '1500.50', openingCredit: '0.00' }),
        ledger({ id: 'l2', openingDebit: '0.00', openingCredit: '1500.50' }),
      ]);

      const summary = await service.openingBalanceSummary(COMPANY_ID);

      expect(summary).toEqual({
        totalDebit: '1500.50',
        totalCredit: '1500.50',
        difference: '0.00',
        isBalanced: true,
      });
    });

    it('reports the difference rather than rejecting an unbalanced set', async () => {
      // Real opening figures rarely tie on the first pass. Refusing them would
      // stop the owner entering what they actually know.
      ledgerRepo.find.mockResolvedValue([
        ledger({ id: 'l1', openingDebit: '2000.00', openingCredit: '0.00' }),
        ledger({ id: 'l2', openingDebit: '0.00', openingCredit: '1250.00' }),
      ]);

      const summary = await service.openingBalanceSummary(COMPANY_ID);

      expect(summary.difference).toBe('750.00');
      expect(summary.isBalanced).toBe(false);
    });

    it('adds paise exactly, with no floating-point drift', async () => {
      // 0.1 + 0.2 in JS numbers is 0.30000000000000004.
      ledgerRepo.find.mockResolvedValue([
        ledger({ id: 'l1', openingDebit: '0.10', openingCredit: '0.00' }),
        ledger({ id: 'l2', openingDebit: '0.20', openingCredit: '0.00' }),
        ledger({ id: 'l3', openingDebit: '0.00', openingCredit: '0.30' }),
      ]);

      const summary = await service.openingBalanceSummary(COMPANY_ID);

      expect(summary.totalDebit).toBe('0.30');
      expect(summary.isBalanced).toBe(true);
    });
  });

  describe('openingOnNaturalSide', () => {
    it('reads a debit opening on an asset as positive', () => {
      const value = service.openingOnNaturalSide(ledger({ openingDebit: '500.00' }), group({ nature: 'asset' }));
      expect(value.toFixed(2)).toBe('500.00');
    });

    it('reads a credit opening on an asset as negative, not as a liability', () => {
      const value = service.openingOnNaturalSide(ledger({ openingCredit: '500.00' }), group({ nature: 'asset' }));
      expect(value.toFixed(2)).toBe('-500.00');
    });

    it('reads a credit opening on a liability as positive', () => {
      const value = service.openingOnNaturalSide(ledger({ openingCredit: '500.00' }), group({ nature: 'liability' }));
      expect(value.toFixed(2)).toBe('500.00');
    });
  });
});
