/* eslint-disable @typescript-eslint/unbound-method */
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { AuditService } from '../../modules/audit/audit.service';
import { AuditLog } from '../../modules/audit/entities/audit-log.entity';
import { auditContext } from './audit-context';

/**
 * The AsyncLocalStorage carries the request's actor kind + support session id
 * through every audit write for the whole handler, so services do not have to
 * thread a parameter. This proves that: a write inside `auditContext.run()`
 * gets the context's values; a write outside it defaults to `user` / null.
 */
describe('AuditService + auditContext', () => {
  let service: AuditService;
  let repo: jest.Mocked<Repository<AuditLog>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: {
            save: jest.fn((e: unknown) => Promise.resolve(e as AuditLog)),
            create: jest.fn((data: unknown) => data as AuditLog),
          },
        },
      ],
    }).compile();

    service = module.get(AuditService);
    repo = module.get(getRepositoryToken(AuditLog));
  });

  it('stamps a write inside a support session with the context values', async () => {
    await auditContext.run({ actorKind: 'platform_support', supportSessionId: 'sess-1' }, async () => {
      await service.record({
        companyId: 'c-1',
        userId: 'u-1',
        entityName: 'vouchers',
        action: 'CREATE',
      });
    });

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ actorKind: 'platform_support', supportSessionId: 'sess-1' }),
    );
  });

  it('stamps an ordinary request as `user` and leaves the session id null', async () => {
    await service.record({ companyId: 'c-1', userId: 'u-1', entityName: 'vouchers', action: 'CREATE' });

    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ actorKind: 'user', supportSessionId: null }));
  });

  it('clears the session id when the explicit actor kind is not `platform_support` — DB constraint pairs them', async () => {
    await auditContext.run({ actorKind: 'platform_support', supportSessionId: 'sess-1' }, async () => {
      await service.record({
        companyId: 'c-1',
        userId: 'u-1',
        entityName: 'vouchers',
        action: 'CREATE',
        actorKind: 'user',
      });
    });

    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ actorKind: 'user', supportSessionId: null }));
  });
});
