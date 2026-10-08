import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../auth.service';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { UserCompany } from '../entities/user-company.entity';
import { UserSite } from '../entities/user-site.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { Company } from '../../company/entities/company.entity';
import { Site } from '../../company/entities/site.entity';

interface MockRepo {
  find: jest.Mock;
  findOne: jest.Mock;
  findOneBy: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  update: jest.Mock;
  findByIds: jest.Mock;
}

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: MockRepo;
  let userCompanyRepo: MockRepo;
  let companyRepository: MockRepo;
  let roleRepository: MockRepo;
  let rolePermissionRepo: MockRepo;
  let userSiteRepo: MockRepo;
  let siteRepository: MockRepo;

  const mockRepository = (): MockRepo => ({
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn((dto: unknown) => dto),
    save: jest.fn((dto: unknown) => Promise.resolve({ id: 'mock-uuid', ...(dto as object) })),
    update: jest.fn(),
    findByIds: jest.fn(() => Promise.resolve([])),
  });

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
    userCompanyRepo = mockRepository();
    companyRepository = mockRepository();
    roleRepository = mockRepository();
    rolePermissionRepo = mockRepository();
    userSiteRepo = mockRepository();
    siteRepository = mockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(Company), useValue: companyRepository },
        { provide: getRepositoryToken(Site), useValue: siteRepository },
        { provide: getRepositoryToken(Role), useValue: roleRepository },
        { provide: getRepositoryToken(Permission), useValue: mockRepository() },
        { provide: getRepositoryToken(RolePermission), useValue: rolePermissionRepo },
        { provide: getRepositoryToken(UserCompany), useValue: userCompanyRepo },
        { provide: getRepositoryToken(UserSite), useValue: userSiteRepo },
        { provide: getRepositoryToken(RefreshToken), useValue: mockRepository() },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw UnauthorizedException if user not found on login', async () => {
    userRepository.findOne.mockResolvedValue(null);

    await expect(service.login({ emailOrMobile: 'admin@brics.in', password: 'password123' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should successfully log in user with valid credentials', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const mockUser = {
      id: 'user-1',
      email: 'admin@brics.in',
      mobile: '9876543210',
      name: 'Admin User',
      passwordHash: hashedPassword,
      isActive: true,
      isSuperAdmin: false,
    };
    const mockCompany = {
      id: 'company-1',
      name: 'BRICS Kiln Ltd',
      gstin: '09AABCU9603R1ZM',
      stateCode: '09',
      isActive: true,
    };
    const mockRole = { id: 'role-1', code: 'owner', name: 'Owner' };

    userRepository.findOne.mockResolvedValue(mockUser);
    userCompanyRepo.find.mockResolvedValue([
      { userId: 'user-1', companyId: 'company-1', roleId: 'role-1', isDefault: true },
    ]);
    companyRepository.findOneBy.mockResolvedValue(mockCompany);
    roleRepository.findOneBy.mockResolvedValue(mockRole);
    rolePermissionRepo.find.mockResolvedValue([]);
    userSiteRepo.find.mockResolvedValue([]);
    siteRepository.find.mockResolvedValue([]);

    const result = await service.login({
      emailOrMobile: 'admin@brics.in',
      password: 'password123',
    });

    expect(result).toBeDefined();
    expect(result.accessToken).toBe('mock-token');
    expect(result.user.name).toBe('Admin User');
    expect(result.company.name).toBe('BRICS Kiln Ltd');
  });
});
