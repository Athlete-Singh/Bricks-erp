import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { UserCompany } from './entities/user-company.entity';
import { UserSite } from './entities/user-site.entity';

/**
 * Single source of truth for "may this user touch this company?".
 * Other modules use this instead of reading `user_companies` directly, so the
 * tenancy rule lives in one place (AGENTS.md rule 5).
 */
@Injectable()
export class MembershipService {
  constructor(
    @InjectRepository(UserCompany) private userCompanyRepo: Repository<UserCompany>,
    @InjectRepository(UserSite) private userSiteRepo: Repository<UserSite>,
  ) {}

  async findMembership(userId: string, companyId: string): Promise<UserCompany | null> {
    return this.userCompanyRepo.findOne({ where: { userId, companyId } });
  }

  async companyIdsFor(userId: string): Promise<string[]> {
    const memberships = await this.userCompanyRepo.find({ where: { userId } });
    return memberships.map((m) => m.companyId);
  }

  async isMember(userId: string, companyId: string): Promise<boolean> {
    return (await this.findMembership(userId, companyId)) !== null;
  }

  /**
   * Throws unless the user belongs to the company. Super admins bypass, since
   * they administer every tenant.
   */
  async assertMember(userId: string, companyId: string, isSuperAdmin = false): Promise<void> {
    if (isSuperAdmin) return;
    if (!(await this.isMember(userId, companyId))) {
      throw new ForbiddenException('You do not have access to this company');
    }
  }

  /**
   * Pass `manager` to enlist in a caller's transaction (e.g. create company +
   * make the creator its owner atomically).
   */
  async addMembership(
    userId: string,
    companyId: string,
    roleId: string,
    isDefault = false,
    manager?: EntityManager,
  ): Promise<UserCompany> {
    const repo = manager ? manager.getRepository(UserCompany) : this.userCompanyRepo;
    const existing = await repo.findOne({ where: { userId, companyId } });
    if (existing) return existing;
    return repo.save(repo.create({ userId, companyId, roleId, isDefault }));
  }

  /** Site ids the user is explicitly granted; empty means "all sites of the company". */
  async siteIdsFor(userId: string): Promise<string[]> {
    const rows = await this.userSiteRepo.find({ where: { userId } });
    return rows.map((r) => r.siteId);
  }

  async replaceSiteAccess(userId: string, siteIds: string[], manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(UserSite) : this.userSiteRepo;
    await repo.delete({ userId });
    if (siteIds.length === 0) return;
    await repo.save(siteIds.map((siteId) => repo.create({ userId, siteId })));
  }

  async userIdsInCompany(companyId: string): Promise<string[]> {
    const rows = await this.userCompanyRepo.find({ where: { companyId } });
    return rows.map((r) => r.userId);
  }

  async membershipsForUsers(companyId: string, userIds: string[]): Promise<UserCompany[]> {
    if (userIds.length === 0) return [];
    return this.userCompanyRepo.find({ where: { companyId, userId: In(userIds) } });
  }

  async setRole(userId: string, companyId: string, roleId: string, manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(UserCompany) : this.userCompanyRepo;
    await repo.update({ userId, companyId }, { roleId });
  }
}
