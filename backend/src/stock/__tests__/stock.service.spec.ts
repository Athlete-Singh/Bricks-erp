import { Test } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { BusinessRuleException } from '../../common/exceptions/business-rule.exception';
import { AuditService } from '../../modules/audit/audit.service';
import { StockService } from '../stock.service';

/**
 * The rules `StockService` holds, tested without a database.
 *
 * The balance arithmetic and the CHECK constraints are covered by the e2e
 * suite against real Postgres; what matters here is that each refusal happens
 * for the stated reason and carries the code the UI switches on.
 */
describe('StockService', () => {
  let service: StockService;
  let manager: jest.Mocked<
    Pick<EntityManager, 'findOne' | 'save' | 'create' | 'createQueryBuilder' | 'query'> & {
      queryRunner: { isTransactionActive: boolean };
    }
  >;

  const WAREHOUSE = { id: 'w1', companyId: 'c1', siteId: 's1', name: 'Main Yard', isActive: true };
  const ITEM = { id: 'i1', companyId: 'c1', name: 'Coal', isActive: true };

  /** A query builder stub that always reports the balance it is given. */
  function balanceOf(value: string) {
    return {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ balance: value }),
    };
  }

  beforeEach(async () => {
    manager = {
      findOne: jest.fn(),
      save: jest.fn((entity: unknown) => Promise.resolve(entity)),
      create: jest.fn((_entity: unknown, data: unknown) => ({ id: 'm1', ...(data as object) })),
      createQueryBuilder: jest.fn(() => balanceOf('0')),
      // The advisory lock (ADR-027) runs raw SQL and only holds inside a
      // transaction, so the stub has to look like one.
      query: jest.fn(() => Promise.resolve([])),
      queryRunner: { isTransactionActive: true },
    } as never;

    const moduleRef = await Test.createTestingModule({
      providers: [
        StockService,
        { provide: getEntityManagerToken(), useValue: manager },
        { provide: AuditService, useValue: { record: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(StockService);
  });

  const input = (overrides: Record<string, unknown> = {}) => ({
    companyId: 'c1',
    userId: 'u1',
    warehouseId: 'w1',
    itemId: 'i1',
    brickTypeId: null,
    movementType: 'purchase' as const,
    direction: 'in' as const,
    quantity: '100',
    movementDate: '2026-10-09',
    ...overrides,
  });

  function expectRefusal(promise: Promise<unknown>, code: string) {
    return expect(promise).rejects.toMatchObject({ code });
  }

  describe('what it refuses', () => {
    it('refuses a zero quantity — a movement that moves nothing is a mistake', async () => {
      await expectRefusal(service.record(manager as never, input({ quantity: '0' })), 'STOCK_QUANTITY_INVALID');
    });

    it('refuses a warehouse from another company, rather than writing across tenants', async () => {
      manager.findOne.mockResolvedValue(null);
      await expectRefusal(service.record(manager as never, input()), 'WAREHOUSE_NOT_FOUND');
    });

    it('refuses a warehouse that is no longer in use', async () => {
      manager.findOne.mockResolvedValue({ ...WAREHOUSE, isActive: false });
      await expectRefusal(service.record(manager as never, input()), 'WAREHOUSE_INACTIVE');
    });

    it('refuses a movement whose item and grade are not the same pile', async () => {
      // Naming both is allowed — a grade is stocked as an item (ADR-051) — but
      // a pair that disagrees means one of the two is wrong, and picking a
      // winner would move the wrong pile.
      manager.findOne
        .mockResolvedValueOnce(WAREHOUSE)
        .mockResolvedValueOnce({ id: 'b1', grade: 'Class 1', itemId: 'another-item', isActive: true });
      await expectRefusal(service.record(manager as never, input({ brickTypeId: 'b1' })), 'STOCK_SUBJECT_MISMATCH');
    });

    it('refuses a movement naming neither', async () => {
      manager.findOne.mockResolvedValue(WAREHOUSE);
      await expectRefusal(
        service.record(manager as never, input({ itemId: null, brickTypeId: null })),
        'STOCK_SUBJECT_INVALID',
      );
    });

    it('refuses an item from another company', async () => {
      manager.findOne.mockResolvedValueOnce(WAREHOUSE).mockResolvedValueOnce(null);
      await expectRefusal(service.record(manager as never, input()), 'ITEM_NOT_FOUND');
    });

    it('refuses an inactive item', async () => {
      manager.findOne.mockResolvedValueOnce(WAREHOUSE).mockResolvedValueOnce({ ...ITEM, isActive: false });
      await expectRefusal(service.record(manager as never, input()), 'ITEM_INACTIVE');
    });
  });

  describe('taking stock out', () => {
    beforeEach(() => {
      manager.findOne.mockResolvedValueOnce(WAREHOUSE).mockResolvedValueOnce(ITEM);
    });

    it('refuses to take out more than is there — ADR-026', async () => {
      manager.createQueryBuilder.mockReturnValue(balanceOf('40') as never);
      await expectRefusal(
        service.record(manager as never, input({ direction: 'out', quantity: '100' })),
        'STOCK_INSUFFICIENT',
      );
    });

    it('says how much is actually there, so the message is useful at the yard', async () => {
      manager.createQueryBuilder.mockReturnValue(balanceOf('40') as never);
      await service
        .record(manager as never, input({ direction: 'out', quantity: '100' }))
        .catch((error: BusinessRuleException) => {
          expect(error.message).toContain('40.000');
          expect(error.message).toContain('Coal');
          expect(error.message).toContain('Main Yard');
        });
      expect.hasAssertions();
    });

    it('allows taking out exactly the balance', async () => {
      manager.createQueryBuilder.mockReturnValue(balanceOf('100') as never);
      const movement = await service.record(manager as never, input({ direction: 'out', quantity: '100' }));
      expect(movement.quantityOut).toBe('100.000');
      expect(movement.quantityIn).toBe('0.000');
    });

    it('lets an adjustment go below zero, because the yard is the source of truth', async () => {
      manager.createQueryBuilder.mockReturnValue(balanceOf('10') as never);
      const movement = await service.record(
        manager as never,
        input({ direction: 'out', quantity: '50', movementType: 'adjustment', allowNegative: true }),
      );
      expect(movement.quantityOut).toBe('50.000');
    });

    it('takes a lock before reading the balance, so the check cannot race', async () => {
      manager.createQueryBuilder.mockReturnValue(balanceOf('100') as never);
      await service.record(manager as never, input({ direction: 'out', quantity: '10' }));

      expect(manager.query).toHaveBeenCalledWith(expect.stringContaining('pg_advisory_xact_lock'), [
        expect.stringContaining('stock:c1:w1:i1'),
      ]);
    });

    it('refuses outright outside a transaction, rather than locking nothing', async () => {
      // An advisory lock taken outside a transaction is released at once, so the
      // guarantee would be silently absent.
      manager.queryRunner.isTransactionActive = false;
      await expectRefusal(
        service.record(manager as never, input({ direction: 'out', quantity: '10' })),
        'STOCK_REQUIRES_TRANSACTION',
      );
    });

    it('does not even read the balance when stock is coming in', async () => {
      await service.record(manager as never, input({ direction: 'in' }));
      expect(manager.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('what it writes', () => {
    beforeEach(() => {
      manager.findOne.mockResolvedValueOnce(WAREHOUSE).mockResolvedValueOnce(ITEM);
    });

    it('keeps quantities one-sided and at three decimals', async () => {
      const movement = await service.record(manager as never, input({ quantity: '12.5' }));
      expect(movement.quantityIn).toBe('12.500');
      expect(movement.quantityOut).toBe('0.000');
    });

    it('takes the site from the warehouse, never from the caller', async () => {
      // A caller-supplied siteId could point at another kiln; the warehouse knows.
      const movement = await service.record(manager as never, input({ siteId: 'somewhere-else' }));
      expect(movement.siteId).toBe('s1');
    });

    it('records the document that caused it', async () => {
      const movement = await service.record(
        manager as never,
        input({ sourceType: 'grn', sourceId: '9f1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d' }),
      );
      expect(movement.sourceType).toBe('grn');
      expect(movement.sourceId).toBe('9f1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d');
    });
  });
});
