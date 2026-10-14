import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { SUSPENDED_TENANT_SIGN_IN_MESSAGE } from '@brics/shared';
import { AuthService } from '../auth.service';
import { MembershipService } from '../membership.service';
import { RolesService } from '../roles.service';
import { AuditService } from '../../audit/audit.service';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { Company } from '../../company/entities/company.entity';
import { Site } from '../../company/entities/site.entity';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_COMPANY_ID = '22222222-2222-2222-2222-222222222222';
const USER_ID = '33333333-3333-3333-3333-333333333333';
const ROLE_ID = '44444444-4444-4444-4444-444444444444';

const mockRepository = () => ({
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn((dto: unknown) => dto),
  save: jest.fn((dto: unknown) => Promise.resolve({ id: 'mock-uuid', ...(dto as object) })),
  update: jest.fn(),
  delete: jest.fn().mockResolvedValue({ affected: 0 }),
});

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: ReturnType<typeof mockRepository>;
  let companyRepository: ReturnType<typeof mockRepository>;
  let refreshTokenRepo: ReturnType<typeof mockRepository>;
  let membership: jest.Mocked<Partial<MembershipService>>;
  let roles: jest.Mocked<Partial<RolesService>>;
  let audit: jest.Mocked<Partial<AuditService>>;

  const activeUser = async (overrides: Partial<User> = {}) =>
    ({
      id: USER_ID,
      email: 'owner@kiln.test',
      mobile: '9876543210',
      name: 'Owner',
      passwordHash: await bcrypt.hash('correct-horse', 10),
      isActive: true,
      isSuperAdmin: false,
      ...overrides,
    }) as User;

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('mock-token'),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_ACCESS_SECRET') return 'mock-access-secret-at-least-32-chars';
      if (key === 'JWT_REFRESH_SECRET') return 'mock-refresh-secret-at-least-32-chars';
      if (key === 'JWT_ACCESS_TTL') return '15m';
      if (key === 'JWT_REFRESH_TTL') return '30d';
      return null;
    }),
  };

  beforeEach(async () => {
    userRepository = mockRepository();
    companyRepository = mockRepository();
    refreshTokenRepo = mockRepository();

    membership = {
      companyIdsFor: jest.fn().mockResolvedValue([COMPANY_ID]),
      findMembership: jest.fn().mockResolvedValue({ userId: USER_ID, companyId: COMPANY_ID, roleId: ROLE_ID }),
      siteIdsFor: jest.fn().mockResolvedValue([]),
      assertMember: jest.fn().mockResolvedValue(undefined),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    roles = {
      findById: jest.fn().mockResolvedValue({ id: ROLE_ID, code: 'owner' }),
      permissionCodesFor: jest.fn().mockResolvedValue(['company.view', 'company.manage']),
    };

    companyRepository.findOneBy.mockResolvedValue({
      id: COMPANY_ID,
      name: 'Shri Ram Bricks',
      gstin: null,
      stateCode: '09',
      isActive: true,
      status: 'active',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(Company), useValue: companyRepository },
        { provide: getRepositoryToken(Site), useValue: mockRepository() },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshTokenRepo },
        { provide: MembershipService, useValue: membership },
        { provide: RolesService, useValue: roles },
        { provide: AuditService, useValue: audit },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('rejects an unknown email or mobile', async () => {
      userRepository.findOne.mockResolvedValue(null);
      await expect(service.login({ emailOrMobile: 'nobody@kiln.test', password: 'x' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a wrong password with the same message as an unknown user', async () => {
      userRepository.findOne.mockResolvedValue(await activeUser());
      await expect(service.login({ emailOrMobile: 'owner@kiln.test', password: 'wrong-password' })).rejects.toThrow(
        'Invalid email/mobile or password',
      );
    });

    it('rejects an inactive user even with the right password', async () => {
      userRepository.findOne.mockResolvedValue(await activeUser({ isActive: false }));
      await expect(service.login({ emailOrMobile: 'owner@kiln.test', password: 'correct-horse' })).rejects.toThrow(
        'User account is inactive',
      );
    });

    it('refuses sign-in when the tenant is suspended, with a named-contact message (PLT-06)', async () => {
      userRepository.findOne.mockResolvedValue(await activeUser());
      companyRepository.findOneBy.mockResolvedValue({
        id: COMPANY_ID,
        name: 'Shri Ram Bricks',
        gstin: null,
        stateCode: '09',
        isActive: true,
        status: 'suspended',
      });

      await expect(service.login({ emailOrMobile: 'owner@kiln.test', password: 'correct-horse' })).rejects.toThrow(
        SUSPENDED_TENANT_SIGN_IN_MESSAGE,
      );
    });

    it('returns tokens, company and the role permissions on valid credentials', async () => {
      userRepository.findOne.mockResolvedValue(await activeUser());

      const result = await service.login({ emailOrMobile: 'owner@kiln.test', password: 'correct-horse' });

      expect(result.accessToken).toBe('mock-token');
      expect(result.user.roleCode).toBe('owner');
      expect(result.user.permissions).toEqual(['company.view', 'company.manage']);
      expect(result.company.id).toBe(COMPANY_ID);
      expect(refreshTokenRepo.save).toHaveBeenCalledTimes(1);
    });

    it('writes a LOGIN entry to the audit trail (ADM-07)', async () => {
      userRepository.findOne.mockResolvedValue(await activeUser());

      await service.login(
        { emailOrMobile: 'owner@kiln.test', password: 'correct-horse' },
        { ipAddress: '10.0.0.5', userAgent: 'jest' },
      );

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN', userId: USER_ID, ipAddress: '10.0.0.5' }),
      );
    });

    it('refuses a user who belongs to no company', async () => {
      userRepository.findOne.mockResolvedValue(await activeUser());
      membership.companyIdsFor = jest.fn().mockResolvedValue([]);

      await expect(service.login({ emailOrMobile: 'owner@kiln.test', password: 'correct-horse' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('fails instead of falling back to a role the user was never granted', async () => {
      userRepository.findOne.mockResolvedValue(await activeUser());
      roles.findById = jest.fn().mockResolvedValue(null);

      await expect(service.login({ emailOrMobile: 'owner@kiln.test', password: 'correct-horse' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('persists the refresh token hashed, never in plain text', async () => {
      userRepository.findOne.mockResolvedValue(await activeUser());

      const result = await service.login({ emailOrMobile: 'owner@kiln.test', password: 'correct-horse' });
      const saved = refreshTokenRepo.save.mock.calls[0]?.[0] as { tokenHash: string };

      expect(saved.tokenHash).not.toBe(result.refreshToken);
      expect(await bcrypt.compare(result.refreshToken, saved.tokenHash)).toBe(true);
    });

    it('derives the stored expiry from JWT_REFRESH_TTL', async () => {
      userRepository.findOne.mockResolvedValue(await activeUser());

      await service.login({ emailOrMobile: 'owner@kiln.test', password: 'correct-horse' });
      const saved = refreshTokenRepo.save.mock.calls[0]?.[0] as { expiresAt: Date };

      const thirtyDays = 30 * 86_400_000;
      expect(saved.expiresAt.getTime() - Date.now()).toBeGreaterThan(thirtyDays - 10_000);
      expect(saved.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(thirtyDays);
    });
  });

  describe('switchCompany (ADM-02)', () => {
    it('refuses a company the user does not belong to', async () => {
      userRepository.findOneBy.mockResolvedValue(await activeUser());
      membership.assertMember = jest.fn().mockRejectedValue(new ForbiddenException());

      await expect(service.switchCompany(USER_ID, { companyId: OTHER_COMPANY_ID })).rejects.toThrow(ForbiddenException);
    });

    it('issues a new session for a company the user belongs to', async () => {
      userRepository.findOneBy.mockResolvedValue(await activeUser());

      const result = await service.switchCompany(USER_ID, { companyId: COMPANY_ID });

      expect(membership.assertMember).toHaveBeenCalledWith(USER_ID, COMPANY_ID, false);
      expect(result.company.id).toBe(COMPANY_ID);
      expect(result.accessToken).toBe('mock-token');
    });
  });

  describe('refresh', () => {
    it('rejects a token whose database row is revoked', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: USER_ID, companyId: COMPANY_ID, jti: 'row-1' });
      userRepository.findOneBy.mockResolvedValue(await activeUser());
      refreshTokenRepo.findOne.mockResolvedValue({
        id: 'row-1',
        userId: USER_ID,
        tokenHash: await bcrypt.hash('some-token', 10),
        isRevoked: true,
        expiresAt: new Date(Date.now() + 86_400_000),
      });

      await expect(service.refresh({ refreshToken: 'some-token' })).rejects.toThrow('Invalid or revoked refresh token');
    });

    it('rejects a token whose row has passed its expiry', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: USER_ID, companyId: COMPANY_ID, jti: 'row-1' });
      userRepository.findOneBy.mockResolvedValue(await activeUser());
      refreshTokenRepo.findOne.mockResolvedValue({
        id: 'row-1',
        userId: USER_ID,
        tokenHash: await bcrypt.hash('some-token', 10),
        isRevoked: false,
        expiresAt: new Date(Date.now() - 1_000),
      });

      await expect(service.refresh({ refreshToken: 'some-token' })).rejects.toThrow('Refresh token has expired');
    });

    it('rejects a row belonging to a different user', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: USER_ID, companyId: COMPANY_ID, jti: 'row-1' });
      userRepository.findOneBy.mockResolvedValue(await activeUser());
      refreshTokenRepo.findOne.mockResolvedValue({
        id: 'row-1',
        userId: 'someone-else',
        tokenHash: await bcrypt.hash('some-token', 10),
        isRevoked: false,
        expiresAt: new Date(Date.now() + 86_400_000),
      });

      await expect(service.refresh({ refreshToken: 'some-token' })).rejects.toThrow('Invalid or revoked refresh token');
    });

    it('rotates: the presented token is revoked and a new pair is issued', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: USER_ID, companyId: COMPANY_ID, jti: 'row-1' });
      userRepository.findOneBy.mockResolvedValue(await activeUser());
      const row = {
        id: 'row-1',
        userId: USER_ID,
        tokenHash: await bcrypt.hash('some-token', 10),
        isRevoked: false,
        expiresAt: new Date(Date.now() + 86_400_000),
      };
      refreshTokenRepo.findOne.mockResolvedValue(row);

      const result = await service.refresh({ refreshToken: 'some-token' });

      expect(row.isRevoked).toBe(true);
      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
    });

    it('looks the row up by id instead of scanning every active token', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: USER_ID, companyId: COMPANY_ID, jti: 'row-1' });
      userRepository.findOneBy.mockResolvedValue(await activeUser());
      refreshTokenRepo.findOne.mockResolvedValue(null);

      await expect(service.refresh({ refreshToken: 'some-token' })).rejects.toThrow(UnauthorizedException);
      expect(refreshTokenRepo.findOne).toHaveBeenCalledWith({ where: { id: 'row-1' } });
      expect(refreshTokenRepo.find).not.toHaveBeenCalled();
    });
  });

  describe('changePassword (ADM-05)', () => {
    it('rejects a wrong current password', async () => {
      userRepository.findOneBy.mockResolvedValue(await activeUser());

      await expect(
        service.changePassword(USER_ID, { currentPassword: 'nope', newPassword: 'new-secret' }),
      ).rejects.toThrow('Current password is incorrect');
    });

    it('rejects reusing the same password', async () => {
      userRepository.findOneBy.mockResolvedValue(await activeUser());

      await expect(
        service.changePassword(USER_ID, { currentPassword: 'correct-horse', newPassword: 'correct-horse' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('stores the new hash and revokes every existing session', async () => {
      const user = await activeUser();
      userRepository.findOneBy.mockResolvedValue(user);

      await service.changePassword(USER_ID, { currentPassword: 'correct-horse', newPassword: 'new-secret' });

      expect(await bcrypt.compare('new-secret', user.passwordHash)).toBe(true);
      expect(refreshTokenRepo.update).toHaveBeenCalledWith({ userId: USER_ID, isRevoked: false }, { isRevoked: true });
    });
  });
});
