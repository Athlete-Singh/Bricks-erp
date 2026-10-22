import { NotificationsService } from '../../notifications/notifications.service';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { AttendanceStatus, WageActivity } from '@brics/shared';
import { PostingService } from '../../../accounting/posting.service';
import { AuditService } from '../../audit/audit.service';
import { IdempotencyService } from '../../../common/idempotency/idempotency.service';
import { BusinessRuleException } from '../../../common/exceptions/business-rule.exception';
import { LabourService } from '../labour.service';

interface MockManager {
  findOne: jest.Mock;
  findOneOrFail: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
  createQueryBuilder: jest.Mock;
  query: jest.Mock;
}

describe('LabourService', () => {
  let service: LabourService;
  let manager: MockManager;
  let postingService: jest.Mocked<PostingService>;
  let auditService: { record: jest.Mock };
  let idempotencyService: { runOnce: jest.Mock };

  beforeEach(async () => {
    postingService = {
      post: jest.fn().mockResolvedValue({
        voucher: { id: 'v1', number: 'V-001', financialYearId: 'fy1' },
        lines: [],
      }),
    } as unknown as jest.Mocked<PostingService>;

    auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    idempotencyService = {
      runOnce: jest.fn((_manager: unknown, _options: unknown, work: () => Promise<unknown>) => work()),
    };

    manager = {
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      save: jest.fn((e: Record<string, unknown>) => Promise.resolve({ id: '1', ...e })),
      create: jest.fn((_cls: unknown, data: Record<string, unknown>) => ({ id: '1', ...data })),
      // Fully chainable: the accrual overlap guard builds a longer query than
      // the exposure total does, and a stub that stops at `where` fails with a
      // type error rather than a useful assertion.
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '10000.00' }),
        // No prior accrual by default; a test that wants one overrides this.
        getOne: jest.fn().mockResolvedValue(null),
      }),
      query: jest.fn().mockResolvedValue([{ green: '20000', fired: '19000' }]),
    };

    const dataSourceMock = {
      transaction: jest.fn((cb: (m: MockManager) => Promise<unknown>) => cb(manager)),
      manager,
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          addOrderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        }),
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        LabourService,
        { provide: DataSource, useValue: dataSourceMock },
        { provide: PostingService, useValue: postingService },
        { provide: AuditService, useValue: auditService },
        { provide: IdempotencyService, useValue: idempotencyService },
        { provide: NotificationsService, useValue: { enqueue: jest.fn(), kick: jest.fn() } },
      ],
    }).compile();

    service = module.get<LabourService>(LabourService);
  });

  describe('createGroup', () => {
    it('refuses to create a group if Sardar is not found or not a sardar', async () => {
      manager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.createGroup('c1', 'u1', {
          sardarPartyId: 'p1',
          name: 'Gang 1',
          activity: WageActivity.MAKING,
          isActive: true,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates a labour group successfully', async () => {
      manager.findOne
        .mockResolvedValueOnce({ id: 'p1', companyId: 'c1', partyTypes: ['sardar'], name: 'Ramesh Sardar' })
        .mockResolvedValueOnce(null); // existing check

      const res = await service.createGroup('c1', 'u1', {
        sardarPartyId: 'p1',
        name: 'Gang 1',
        activity: WageActivity.MAKING,
        isActive: true,
      });

      expect(res).toBeDefined();
      expect(res.name).toBe('Gang 1');
      expect(auditService.record).toHaveBeenCalled();
    });
  });

  describe('future date guards', () => {
    it('refuses attendance dated in the future', async () => {
      await expect(
        service.recordAttendance('c1', 'u1', {
          siteId: 's1',
          labourGroupId: 'g1',
          date: '2099-01-01',
          entries: [{ status: AttendanceStatus.PRESENT, overtimeHours: '0.00' }],
        }),
      ).rejects.toThrow(BusinessRuleException);
    });

    it('refuses advance dated in the future', async () => {
      await expect(
        service.createAdvance('c1', 'u1', {
          siteId: 's1',
          sardarPartyId: 'p1',
          date: '2099-01-01',
          amount: '1000.00',
          paymentMode: 'cash',
          cashBankLedgerId: 'l1',
        }),
      ).rejects.toThrow(BusinessRuleException);
    });
  });

  describe('createAdvance & LEK-03 exposure', () => {
    it('posts payment journal and returns exposure warning details', async () => {
      manager.findOne
        .mockResolvedValueOnce({ id: 's1', companyId: 'c1' }) // site
        .mockResolvedValueOnce({
          id: 'p1',
          companyId: 'c1',
          partyTypes: ['sardar'],
          name: 'Ramesh Sardar',
          ledgerId: 'l1',
        }) // sardar
        .mockResolvedValueOnce({
          id: 'p1',
          companyId: 'c1',
          partyTypes: ['sardar'],
          name: 'Ramesh Sardar',
          ledgerId: 'l1',
        }) // sardar exposure
        .mockResolvedValueOnce({ rateAmount: '650.00' }); // making wage rate

      const result = await service.createAdvance('c1', 'u1', {
        siteId: 's1',
        sardarPartyId: 'p1',
        date: '2026-10-10',
        amount: '5000.00',
        paymentMode: 'cash',
        cashBankLedgerId: 'l2',
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(postingService.post).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ voucherTypeCode: 'payment' }),
      );
      expect(result.advance).toBeDefined();
      expect(result.exposure).toBeDefined();
    });
  });

  describe('getAdvanceExposure (LEK-03)', () => {
    it('calculates net advance exposure correctly', async () => {
      manager.findOne
        .mockResolvedValueOnce({
          id: 'p1',
          companyId: 'c1',
          partyTypes: ['sardar'],
          name: 'Ramesh Sardar',
        })
        .mockResolvedValueOnce({ rateAmount: '700.00' }); // wage rate

      const exp = await service.getAdvanceExposure('c1', 'p1');

      expect(exp.sardarPartyId).toBe('p1');
      expect(exp.sardarName).toBe('Ramesh Sardar');
    });
  });

  describe('accrueWages (LAB-04)', () => {
    it('calculates gross wages from production and posts journal voucher', async () => {
      manager.findOne
        .mockResolvedValueOnce({ id: 's1', companyId: 'c1' }) // site
        .mockResolvedValueOnce({
          id: 'p1',
          companyId: 'c1',
          partyTypes: ['sardar'],
          name: 'Ramesh Sardar',
          ledgerId: 'l1',
        }) // sardar
        .mockResolvedValueOnce({ rateAmount: '650.00' }) // wage rate
        .mockResolvedValueOnce({ id: 'wages-ledger', code: 'LABOUR_WAGES' }); // expense ledger

      manager.query
        .mockResolvedValueOnce([{ green: '10000' }]) // production
        .mockResolvedValueOnce([{ totalDailyWages: '0.00' }]); // attendance

      const res = await service.accrueWages('c1', 'u1', {
        siteId: 's1',
        sardarPartyId: 'p1',
        date: '2026-10-10',
        periodFrom: '2026-10-01',
        periodTo: '2026-10-10',
      });

      expect(res.voucherId).toBe('v1');
      expect(res.grossWages).toBe('6500.00');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(postingService.post).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ voucherTypeCode: 'journal' }),
      );
    });
  });
});
