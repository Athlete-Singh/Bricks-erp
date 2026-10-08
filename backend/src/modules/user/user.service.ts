import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, In, Repository } from 'typeorm';
import type { CreateUserDto, UpdateUserDto } from '@brics/shared';
import { MembershipService } from '../auth/membership.service';
import { RolesService } from '../auth/roles.service';
import { User } from '../auth/entities/user.entity';
import { CompanyService } from '../company/company.service';

/**
 * What the API is allowed to say about a user. Built explicitly so a new column
 * on the entity — `password_hash` above all — can never leak into a response.
 */
export interface UserSummary {
  id: string;
  email: string | null;
  mobile: string;
  name: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  roleCode: string | null;
  siteIds: string[];
  createdAt: Date;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private roles: RolesService,
    private membership: MembershipService,
    private companyService: CompanyService,
    private dataSource: DataSource,
  ) {}

  async findUsersByCompany(companyId: string): Promise<UserSummary[]> {
    const userIds = await this.membership.userIdsInCompany(companyId);
    if (userIds.length === 0) return [];

    const [users, memberships, roleCodes] = await Promise.all([
      this.userRepo.find({ where: { id: In(userIds) }, order: { name: 'ASC' } }),
      this.membership.membershipsForUsers(companyId, userIds),
      this.roles.codeByIdMap(),
    ]);

    const roleByUser = new Map(memberships.map((m) => [m.userId, roleCodes.get(m.roleId) ?? null]));
    return Promise.all(users.map((u) => this.toSummary(u, roleByUser.get(u.id) ?? null)));
  }

  async createUser(companyId: string, actorId: string, dto: CreateUserDto): Promise<UserSummary> {
    const role = await this.roles.requireByCode(dto.roleCode);
    await this.assertIdentifiersFree(dto.mobile, dto.email ?? null);
    const siteIds = await this.assertSitesBelongToCompany(companyId, dto.siteIds ?? []);

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const created = await this.dataSource.transaction(async (manager) => {
      const user = await manager.save(
        manager.create(User, {
          email: dto.email || null,
          mobile: dto.mobile,
          name: dto.name,
          passwordHash,
          isActive: true,
          isSuperAdmin: false,
          createdBy: actorId,
          updatedBy: actorId,
        }),
      );
      await this.membership.addMembership(user.id, companyId, role.id, true, manager);
      await this.membership.replaceSiteAccess(user.id, siteIds, manager);
      return user;
    });

    return this.toSummary(created, role.code);
  }

  /** Change role, kiln access, name/email or active flag (ADM-06). */
  async updateUser(companyId: string, actorId: string, userId: string, dto: UpdateUserDto): Promise<UserSummary> {
    const membership = await this.membership.findMembership(userId, companyId);
    if (!membership) {
      throw new NotFoundException('User not found in this company');
    }
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.email !== undefined && dto.email !== user.email) {
      await this.assertIdentifiersFree(null, dto.email, userId);
    }
    const role = dto.roleCode ? await this.roles.requireByCode(dto.roleCode) : null;
    const siteIds = dto.siteIds ? await this.assertSitesBelongToCompany(companyId, dto.siteIds) : null;

    await this.dataSource.transaction(async (manager) => {
      if (dto.name !== undefined) user.name = dto.name;
      if (dto.email !== undefined) user.email = dto.email;
      if (dto.isActive !== undefined) user.isActive = dto.isActive;
      user.updatedBy = actorId;
      await manager.save(User, user);

      if (role) await this.membership.setRole(userId, companyId, role.id, manager);
      if (siteIds) await this.membership.replaceSiteAccess(userId, siteIds, manager);
    });

    const roleCode = role ? role.code : ((await this.roles.codeByIdMap()).get(membership.roleId) ?? null);
    return this.toSummary(user, roleCode);
  }

  async findAllRoles() {
    return this.roles.findAll();
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  private async toSummary(user: User, roleCode: string | null): Promise<UserSummary> {
    return {
      id: user.id,
      email: user.email,
      mobile: user.mobile,
      name: user.name,
      isActive: user.isActive,
      isSuperAdmin: user.isSuperAdmin,
      roleCode,
      siteIds: await this.membership.siteIdsFor(user.id),
      createdAt: user.createdAt,
    };
  }

  /** Mobile and email are globally unique — report it as 409, not a raw DB error. */
  private async assertIdentifiersFree(
    mobile: string | null,
    email: string | null,
    exceptUserId?: string,
  ): Promise<void> {
    if (mobile) {
      const existing = await this.userRepo.findOne({ where: { mobile } });
      if (existing && existing.id !== exceptUserId) {
        throw new ConflictException('A user with this mobile number already exists');
      }
    }
    if (email) {
      const existing = await this.userRepo.findOne({ where: { email } });
      if (existing && existing.id !== exceptUserId) {
        throw new ConflictException('A user with this email already exists');
      }
    }
  }

  /** Kiln access may only reference kilns of the caller's own company. */
  private async assertSitesBelongToCompany(companyId: string, siteIds: string[]): Promise<string[]> {
    if (siteIds.length === 0) return [];
    const companySites = await this.companyService.findSites(companyId);
    const allowed = new Set(companySites.map((s) => s.id));
    const foreign = siteIds.filter((id) => !allowed.has(id));
    if (foreign.length > 0) {
      throw new BadRequestException('One or more kilns do not belong to this company');
    }
    return siteIds;
  }
}
