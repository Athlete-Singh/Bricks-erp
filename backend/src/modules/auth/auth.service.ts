import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import type { AuthResponseDto, LoginDto, RefreshTokenDto } from '@brics/shared';
import type { Env } from '../../config/env';
import { Company } from '../company/entities/company.entity';
import { Site } from '../company/entities/site.entity';
import { Permission } from './entities/permission.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RolePermission } from './entities/role-permission.entity';
import { Role } from './entities/role.entity';
import { UserCompany } from './entities/user-company.entity';
import { UserSite } from './entities/user-site.entity';
import { User } from './entities/user.entity';
import type { JwtPayload } from '../../common/decorators/auth.decorators';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Company) private companyRepository: Repository<Company>,
    @InjectRepository(Site) private siteRepository: Repository<Site>,
    @InjectRepository(Role) private roleRepository: Repository<Role>,
    @InjectRepository(Permission) private permissionRepository: Repository<Permission>,
    @InjectRepository(RolePermission) private rolePermissionRepo: Repository<RolePermission>,
    @InjectRepository(UserCompany) private userCompanyRepo: Repository<UserCompany>,
    @InjectRepository(UserSite) private userSiteRepo: Repository<UserSite>,
    @InjectRepository(RefreshToken) private refreshTokenRepo: Repository<RefreshToken>,
    private jwtService: JwtService,
    private configService: ConfigService<Env, true>,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepository.findOne({
      where: [{ email: dto.emailOrMobile }, { mobile: dto.emailOrMobile }],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email/mobile or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email/mobile or password');
    }

    const userCompanies = await this.userCompanyRepo.find({ where: { userId: user.id } });
    if (!userCompanies || userCompanies.length === 0) {
      throw new BadRequestException('User is not assigned to any company');
    }

    const primaryUserCompany = userCompanies.find((uc) => uc.isDefault) || userCompanies[0];
    if (!primaryUserCompany) {
      throw new BadRequestException('User is not assigned to any company');
    }
    const company = await this.companyRepository.findOneBy({ id: primaryUserCompany.companyId });
    if (!company || !company.isActive) {
      throw new BadRequestException('Assigned company is inactive or not found');
    }

    const role = await this.roleRepository.findOneBy({ id: primaryUserCompany.roleId });

    const roleCode = role ? role.code : 'supervisor';

    // Get permissions for role
    let permissions: string[] = [];
    if (role) {
      const rolePerms = await this.rolePermissionRepo.find({ where: { roleId: role.id } });
      const permIds = rolePerms.map((rp) => rp.permissionId);
      if (permIds.length > 0) {
        const perms = await this.permissionRepository.findByIds(permIds);
        permissions = perms.map((p) => p.code);
      }
    }

    // Get accessible sites
    const userSites = await this.userSiteRepo.find({ where: { userId: user.id } });
    let sites: Site[] = [];
    if (userSites.length > 0) {
      const siteIds = userSites.map((us) => us.siteId);
      sites = await this.siteRepository.findByIds(siteIds);
    } else {
      sites = await this.siteRepository.find({ where: { companyId: company.id } });
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      mobile: user.mobile,
      name: user.name,
      companyId: company.id,
      roleCode,
      permissions,
      isSuperAdmin: user.isSuperAdmin,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: this.configService.get('JWT_ACCESS_TTL', { infer: true }),
    });

    const refreshSecret = this.configService.get('JWT_REFRESH_SECRET', { infer: true });
    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, companyId: company.id },
      {
        secret: refreshSecret,
        expiresIn: this.configService.get('JWT_REFRESH_TTL', { infer: true }),
      },
    );

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        userId: user.id,
        tokenHash,
        expiresAt,
        isRevoked: false,
      }),
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        mobile: user.mobile,
        name: user.name,
        roleCode,
        permissions,
        isSuperAdmin: user.isSuperAdmin,
      },
      company: {
        id: company.id,
        name: company.name,
        gstin: company.gstin,
        stateCode: company.stateCode,
      },
      sites: sites.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        type: s.type,
      })),
    };
  }

  async refresh(dto: RefreshTokenDto): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const refreshSecret = this.configService.get('JWT_REFRESH_SECRET', { infer: true });
      const payload = await this.jwtService.verifyAsync<{ sub: string; companyId: string }>(dto.refreshToken, {
        secret: refreshSecret,
      });

      const user = await this.userRepository.findOneBy({ id: payload.sub });
      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      const activeTokens = await this.refreshTokenRepo.find({
        where: { userId: user.id, isRevoked: false },
      });

      let validToken: RefreshToken | null = null;
      for (const tokenEntity of activeTokens) {
        const isMatch = await bcrypt.compare(dto.refreshToken, tokenEntity.tokenHash);
        if (isMatch) {
          validToken = tokenEntity;
          break;
        }
      }

      if (!validToken) {
        throw new UnauthorizedException('Invalid or revoked refresh token');
      }

      // Revoke old token
      validToken.isRevoked = true;
      await this.refreshTokenRepo.save(validToken);

      const userCompany = await this.userCompanyRepo.findOne({
        where: { userId: user.id, companyId: payload.companyId },
      });
      const roleId = userCompany ? userCompany.roleId : null;
      const role = roleId ? await this.roleRepository.findOneBy({ id: roleId }) : null;
      const roleCode = role ? role.code : 'supervisor';

      let permissions: string[] = [];
      if (role) {
        const rolePerms = await this.rolePermissionRepo.find({ where: { roleId: role.id } });
        const permIds = rolePerms.map((rp) => rp.permissionId);
        if (permIds.length > 0) {
          const perms = await this.permissionRepository.findByIds(permIds);
          permissions = perms.map((p) => p.code);
        }
      }

      const newAccessPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        mobile: user.mobile,
        name: user.name,
        companyId: payload.companyId,
        roleCode,
        permissions,
        isSuperAdmin: user.isSuperAdmin,
      };

      const accessToken = await this.jwtService.signAsync(newAccessPayload, {
        secret: this.configService.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn: this.configService.get('JWT_ACCESS_TTL', { infer: true }),
      });

      const newRefreshToken = await this.jwtService.signAsync(
        { sub: user.id, companyId: payload.companyId },
        {
          secret: refreshSecret,
          expiresIn: this.configService.get('JWT_REFRESH_TTL', { infer: true }),
        },
      );

      const newHash = await bcrypt.hash(newRefreshToken, 10);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await this.refreshTokenRepo.save(
        this.refreshTokenRepo.create({
          userId: user.id,
          tokenHash: newHash,
          expiresAt,
          isRevoked: false,
        }),
      );

      return { accessToken, refreshToken: newRefreshToken };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string): Promise<{ success: boolean }> {
    await this.refreshTokenRepo.update({ userId, isRevoked: false }, { isRevoked: true });
    return { success: true };
  }
}
