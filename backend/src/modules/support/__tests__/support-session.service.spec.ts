/* eslint-disable @typescript-eslint/unbound-method */
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { SUPPORT_SESSION_TTL_MS } from '@brics/shared';
import { AuditService } from '../../audit/audit.service';
import { Company } from '../../company/entities/company.entity';
import { User } from '../../auth/entities/user.entity';
import { SupportSession } from '../entities/support-session.entity';
import { SupportSessionService } from '../support-session.service';

const ADMIN_ID = 'admin-1';
const TENANT_ID = 'tenant-1';

describe('SupportSessionService (PLT-07)', () => {
  let service: SupportSessionService;
  let sessionRepo: jest.Mocked<Repository<SupportSession>>;
  let companyRepo: jest.Mocked<Repository<Company>>;
  let audit: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SupportSessionService,
        {
          provide: getRepositoryToken(SupportSession),
          useValue: {
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            find: jest.fn(),
            save: jest.fn((e: unknown) => Promise.resolve({ id: 's-1', ...(e as object) } as SupportSession)),
            create: jest.fn((data: unknown) => data as SupportSession),
          },
        },
        { provide: getRepositoryToken(Company), useValue: { findOneBy: jest.fn() } },
        { provide: getRepositoryToken(User), useValue: { findOneBy: jest.fn() } },
        { provide: AuditService, useValue: { record: jest.fn() } },
      ],
    }).compile();

    service = module.get(SupportSessionService);
    sessionRepo = module.get(getRepositoryToken(SupportSession));
    companyRepo = module.get(getRepositoryToken(Company));
    audit = module.get(AuditService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('open', () => {
    it('refuses a reason that is too short — making somebody type one is the control (ADR-052)', async () => {
      companyRepo.findOneBy.mockResolvedValue({ id: TENANT_ID } as Company);
      await expect(service.open(ADMIN_ID, TENANT_ID, '  ')).rejects.toThrow(BadRequestException);
      expect(sessionRepo.save).not.toHaveBeenCalled();
    });

    it('refuses when the tenant does not exist', async () => {
      companyRepo.findOneBy.mockResolvedValue(null);
      await expect(service.open(ADMIN_ID, TENANT_ID, 'investigating a complaint')).rejects.toThrow(NotFoundException);
    });

    it('refuses when an open session already exists for the same (admin, tenant)', async () => {
      companyRepo.findOneBy.mockResolvedValue({ id: TENANT_ID } as Company);
      sessionRepo.findOne.mockResolvedValue({
        id: 'open-1',
        expiresAt: new Date(Date.now() + 60_000),
        closedAt: null,
      } as SupportSession);

      await expect(service.open(ADMIN_ID, TENANT_ID, 'investigating a complaint')).rejects.toThrow(ConflictException);
      expect(sessionRepo.save).not.toHaveBeenCalled();
    });

    it("writes an audit row tagged `platform_support` with the session's own id", async () => {
      companyRepo.findOneBy.mockResolvedValue({ id: TENANT_ID } as Company);
      sessionRepo.findOne.mockResolvedValue(null);

      const session = await service.open(ADMIN_ID, TENANT_ID, 'investigating a complaint');

      expect(session.companyId).toBe(TENANT_ID);
      expect(session.platformUserId).toBe(ADMIN_ID);
      expect(session.expiresAt.getTime() - session.openedAt.getTime()).toBe(SUPPORT_SESSION_TTL_MS);

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entityName: 'support_sessions',
          action: 'CREATE',
          actorKind: 'platform_support',
          supportSessionId: session.id,
        }),
      );
    });

    it('closes an expired-but-unclosed session on the way, then opens a fresh one', async () => {
      companyRepo.findOneBy.mockResolvedValue({ id: TENANT_ID } as Company);
      const stale = {
        id: 'stale',
        companyId: TENANT_ID,
        platformUserId: ADMIN_ID,
        expiresAt: new Date(Date.now() - 60_000),
        closedAt: null,
        closedBy: null,
      } as SupportSession;
      sessionRepo.findOne.mockResolvedValue(stale);

      await service.open(ADMIN_ID, TENANT_ID, 'investigating a complaint');

      expect(stale.closedBy).toBe('expiry');
      expect(sessionRepo.save).toHaveBeenCalled();
    });

    describe('PLT-10 (S3.2) requireSupportApproval setting', () => {
      it('refuses when tenant requires approval and neither active window nor valid code is provided', async () => {
        companyRepo.findOneBy.mockResolvedValue({
          id: TENANT_ID,
          requireSupportApproval: true,
          supportAccessGrantedUntil: null,
          supportAccessCode: null,
        } as Company);

        await expect(service.open(ADMIN_ID, TENANT_ID, 'investigating issue')).rejects.toThrow(
          'SUPPORT_APPROVAL_REQUIRED',
        );
        expect(sessionRepo.save).not.toHaveBeenCalled();
      });

      it('refuses when active window has expired and no code provided', async () => {
        companyRepo.findOneBy.mockResolvedValue({
          id: TENANT_ID,
          requireSupportApproval: true,
          supportAccessGrantedUntil: new Date(Date.now() - 60_000), // expired 1 min ago
          supportAccessCode: '123456',
        } as Company);

        await expect(service.open(ADMIN_ID, TENANT_ID, 'investigating issue')).rejects.toThrow(
          'SUPPORT_APPROVAL_REQUIRED',
        );
        expect(sessionRepo.save).not.toHaveBeenCalled();
      });

      it('refuses when approvalCode does not match', async () => {
        companyRepo.findOneBy.mockResolvedValue({
          id: TENANT_ID,
          requireSupportApproval: true,
          supportAccessGrantedUntil: null,
          supportAccessCode: '654321',
        } as Company);

        await expect(service.open(ADMIN_ID, TENANT_ID, 'investigating issue', '000000')).rejects.toThrow(
          'SUPPORT_APPROVAL_REQUIRED',
        );
        expect(sessionRepo.save).not.toHaveBeenCalled();
      });

      it('allows opening session when supportAccessGrantedUntil is in the future', async () => {
        companyRepo.findOneBy.mockResolvedValue({
          id: TENANT_ID,
          requireSupportApproval: true,
          supportAccessGrantedUntil: new Date(Date.now() + 3600_000), // active for 1h
          supportAccessCode: '123456',
        } as Company);
        sessionRepo.findOne.mockResolvedValue(null);

        const session = await service.open(ADMIN_ID, TENANT_ID, 'investigating with active grant');
        expect(session.companyId).toBe(TENANT_ID);
        expect(sessionRepo.save).toHaveBeenCalled();
      });

      it('allows opening session when approvalCode matches tenant.supportAccessCode', async () => {
        companyRepo.findOneBy.mockResolvedValue({
          id: TENANT_ID,
          requireSupportApproval: true,
          supportAccessGrantedUntil: null,
          supportAccessCode: '987654',
        } as Company);
        sessionRepo.findOne.mockResolvedValue(null);

        const session = await service.open(ADMIN_ID, TENANT_ID, 'investigating with valid code', '987654');
        expect(session.companyId).toBe(TENANT_ID);
        expect(sessionRepo.save).toHaveBeenCalled();
      });
    });
  });

  describe('close', () => {
    it('is idempotent — closing a closed session returns the same row and writes nothing new', async () => {
      sessionRepo.findOneBy.mockResolvedValue({
        id: 's-1',
        platformUserId: ADMIN_ID,
        closedAt: new Date(),
      } as SupportSession);

      await service.close('s-1', ADMIN_ID);
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('refuses a close by anyone other than the opener', async () => {
      sessionRepo.findOneBy.mockResolvedValue({
        id: 's-1',
        platformUserId: 'other-admin',
        closedAt: null,
      } as SupportSession);

      await expect(service.close('s-1', ADMIN_ID)).rejects.toThrow(BadRequestException);
    });

    it('stamps the row `manual` and writes an audit entry', async () => {
      const row = { id: 's-1', platformUserId: ADMIN_ID, companyId: TENANT_ID, closedAt: null } as SupportSession;
      sessionRepo.findOneBy.mockResolvedValue(row);
      sessionRepo.save.mockImplementation((s: unknown) => Promise.resolve(s as SupportSession));

      const closed = await service.close('s-1', ADMIN_ID);

      expect(closed.closedBy).toBe('manual');
      expect(closed.closedAt).toBeInstanceOf(Date);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entityName: 'support_sessions',
          action: 'UPDATE',
          actorKind: 'platform_support',
          supportSessionId: 's-1',
          after: expect.objectContaining({ closedBy: 'manual' }),
        }),
      );
    });
  });
});
