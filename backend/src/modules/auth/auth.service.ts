import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { In, LessThan, Repository } from 'typeorm';
import {
  SUSPENDED_TENANT_SIGN_IN_MESSAGE,
  type AuthResponseDto,
  type ChangePasswordDto,
  type LoginDto,
  type RefreshTokenDto,
  type SwitchCompanyDto,
} from '@brics/shared';
import type { Env } from '../../config/env';
import { parseDurationToMs } from '../../common/time/duration';
import { Company } from '../company/entities/company.entity';
import { Site } from '../company/entities/site.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from './entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { MembershipService } from './membership.service';
import { RolesService } from './roles.service';
import type { JwtPayload } from '../../common/decorators/auth.decorators';

/** Request metadata recorded with sign-in events. */
export interface RequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * TTLs are validated as strings by the env schema ("15m", "30d"); jsonwebtoken
 * types them as its own `StringValue` union, so narrow once here.
 */
type ExpiresIn = JwtSignOptions['expiresIn'];
const asExpiresIn = (ttl: string): ExpiresIn => ttl as ExpiresIn;

/** Claims in the refresh token. `jti` is the `refresh_tokens` row id. */
interface RefreshClaims {
  sub: string;
  companyId: string;
  jti: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Company) private companyRepository: Repository<Company>,
    @InjectRepository(Site) private siteRepository: Repository<Site>,
    @InjectRepository(RefreshToken) private refreshTokenRepo: Repository<RefreshToken>,
    private membership: MembershipService,
    private roles: RolesService,
    private audit: AuditService,
    private jwtService: JwtService,
    private configService: ConfigService<Env, true>,
  ) {}

  async login(dto: LoginDto, context?: RequestContext): Promise<AuthResponseDto> {
    const user = await this.userRepository.findOne({
      where: [{ email: dto.emailOrMobile }, { mobile: dto.emailOrMobile }],
    });

    // Same message for unknown user and wrong password: don't confirm which exists.
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email/mobile or password');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    const companyId = await this.defaultCompanyIdFor(user.id);
    const session = await this.buildSession(user, companyId);
    await this.audit.record({
      companyId,
      userId: user.id,
      entityName: 'users',
      entityId: user.id,
      action: 'LOGIN',
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    });
    return session;
  }

  /** ADM-02: move the session to another company the user belongs to. */
  async switchCompany(userId: string, dto: SwitchCompanyDto): Promise<AuthResponseDto> {
    const user = await this.requireActiveUser(userId);
    await this.membership.assertMember(userId, dto.companyId, user.isSuperAdmin);
    return this.buildSession(user, dto.companyId);
  }

  async refresh(dto: RefreshTokenDto): Promise<TokenPair> {
    const claims = await this.verifyRefreshToken(dto.refreshToken);
    const user = await this.requireActiveUser(claims.sub);

    // O(1): the row id travels in the token, so this is one lookup and one compare.
    const stored = await this.refreshTokenRepo.findOne({ where: { id: claims.jti } });
    if (!stored || stored.isRevoked || stored.userId !== user.id) {
      throw new UnauthorizedException('Invalid or revoked refresh token');
    }
    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token has expired');
    }
    if (!(await bcrypt.compare(dto.refreshToken, stored.tokenHash))) {
      throw new UnauthorizedException('Invalid or revoked refresh token');
    }

    stored.isRevoked = true;
    await this.refreshTokenRepo.save(stored);

    const { roleCode, permissions } = await this.resolveAccess(user, claims.companyId);
    return this.issueTokens(user, claims.companyId, roleCode, permissions);
  }

  async logout(userId: string): Promise<{ success: boolean }> {
    await this.refreshTokenRepo.update({ userId, isRevoked: false }, { isRevoked: true });
    return { success: true };
  }

  /** Separate from `logout` so an internal revoke does not look like a sign-out. */
  async logoutAndAudit(userId: string, companyId: string | null): Promise<{ success: boolean }> {
    const result = await this.logout(userId);
    await this.audit.record({
      companyId,
      userId,
      entityName: 'users',
      entityId: userId,
      action: 'LOGOUT',
    });
    return result;
  }

  /** ADM-05: every other session is revoked, so a stolen token dies with the change. */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ success: boolean }> {
    const user = await this.requireActiveUser(userId);
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from the current one');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    user.updatedBy = userId;
    await this.userRepository.save(user);
    await this.logout(userId);
    await this.audit.record({
      companyId: null,
      userId,
      entityName: 'users',
      entityId: userId,
      action: 'PASSWORD_CHANGE',
    });
    return { success: true };
  }

  /** Housekeeping so `refresh_tokens` does not grow without bound. */
  async purgeExpiredTokens(): Promise<number> {
    const result = await this.refreshTokenRepo.delete({ expiresAt: LessThan(new Date()) });
    return result.affected ?? 0;
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private async buildSession(user: User, companyId: string): Promise<AuthResponseDto> {
    const company = await this.companyRepository.findOneBy({ id: companyId });
    if (!company || !company.isActive) {
      throw new BadRequestException('Assigned company is inactive or not found');
    }
    // PLT-06: a suspended tenant's users are refused with a message naming who
    // to contact, not a generic failure. The same string is used by mobile.
    if (company.status === 'suspended') {
      throw new UnauthorizedException(SUSPENDED_TENANT_SIGN_IN_MESSAGE);
    }

    const { roleCode, permissions } = await this.resolveAccess(user, companyId);
    const tokens = await this.issueTokens(user, companyId, roleCode, permissions);
    const sites = await this.sitesFor(user.id, companyId);

    return {
      ...tokens,
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
        gstScheme: company.gstScheme,
      },
      sites: sites.map((s) => ({ id: s.id, name: s.name, code: s.code, type: s.type })),
    };
  }

  private async defaultCompanyIdFor(userId: string): Promise<string> {
    const companyIds = await this.membership.companyIdsFor(userId);
    if (companyIds.length === 0) {
      throw new ForbiddenException('User is not assigned to any company');
    }
    for (const companyId of companyIds) {
      const membership = await this.membership.findMembership(userId, companyId);
      if (membership?.isDefault) return companyId;
    }
    return companyIds[0] as string;
  }

  /**
   * Role and permissions for this user in this company. A membership pointing at
   * a role that is not seeded is a data fault — fail, never fall back to a role
   * the user was not granted.
   */
  private async resolveAccess(user: User, companyId: string): Promise<{ roleCode: string; permissions: string[] }> {
    const membership = await this.membership.findMembership(user.id, companyId);
    if (!membership) {
      if (user.isSuperAdmin) {
        return { roleCode: 'super_admin', permissions: [] };
      }
      throw new ForbiddenException('You do not have access to this company');
    }

    const role = await this.roles.findById(membership.roleId);
    if (!role) {
      throw new ForbiddenException('Your role is missing or not seeded. Contact an administrator.');
    }
    return { roleCode: role.code, permissions: await this.roles.permissionCodesFor(role.id) };
  }

  private async sitesFor(userId: string, companyId: string): Promise<Site[]> {
    const grantedIds = await this.membership.siteIdsFor(userId);
    if (grantedIds.length === 0) {
      return this.siteRepository.find({ where: { companyId } });
    }
    return this.siteRepository.find({ where: { companyId, id: In(grantedIds) } });
  }

  private async issueTokens(
    user: User,
    companyId: string,
    roleCode: string,
    permissions: string[],
  ): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      mobile: user.mobile,
      name: user.name,
      companyId,
      roleCode,
      permissions,
      isSuperAdmin: user.isSuperAdmin,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: asExpiresIn(this.configService.get('JWT_ACCESS_TTL', { infer: true })),
    });

    // The row id is minted first so it can travel in the token as `jti`.
    const tokenId = randomUUID();
    const refreshTtl = this.configService.get('JWT_REFRESH_TTL', { infer: true });
    const claims: RefreshClaims = { sub: user.id, companyId, jti: tokenId };
    const refreshToken = await this.jwtService.signAsync(claims, {
      secret: this.configService.get('JWT_REFRESH_SECRET', { infer: true }),
      expiresIn: asExpiresIn(refreshTtl),
    });

    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        id: tokenId,
        userId: user.id,
        tokenHash: await bcrypt.hash(refreshToken, 10),
        expiresAt: new Date(Date.now() + parseDurationToMs(refreshTtl)),
        isRevoked: false,
      }),
    );

    return { accessToken, refreshToken };
  }

  private async verifyRefreshToken(token: string): Promise<RefreshClaims> {
    try {
      return await this.jwtService.verifyAsync<RefreshClaims>(token, {
        secret: this.configService.get('JWT_REFRESH_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private async requireActiveUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }
    return user;
  }
}
