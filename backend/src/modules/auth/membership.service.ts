import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, IsNull, Repository } from 'typeorm';
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
    const rows = await this.userSiteRepo.find({ where: { userId, revokedAt: IsNull() } });
    return rows.map((r) => r.siteId);
  }

  /** Grants taken away at or after `since` — the kiln delta turns these into tombstones. */
  async siteIdsRevokedSince(userId: string, since: string): Promise<string[]> {
    const rows = await this.userSiteRepo
      .createQueryBuilder('us')
      .where('us.user_id = :userId', { userId })
      .andWhere('us.revoked_at >= :since', { since })
      .getMany();
    return rows.map((r) => r.siteId);
  }

  /**
   * A grant that is dropped is stamped, not deleted: the device only ever learns
   * a kiln is gone from a tombstone, and a deleted row leaves nothing to build
   * one from. Re-granting revives the same row, so the `(user, site)` unique
   * key still holds.
   */
  async replaceSiteAccess(userId: string, siteIds: string[], manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(UserSite) : this.userSiteRepo;
    const existing = await repo.find({ where: { userId } });
    const wanted = new Set(siteIds);

    const toRevoke = existing.filter((r) => r.revokedAt === null && !wanted.has(r.siteId)).map((r) => r.id);
    if (toRevoke.length > 0) await repo.update({ id: In(toRevoke) }, { revokedAt: new Date() });

    const toRestore = existing.filter((r) => r.revokedAt !== null && wanted.has(r.siteId)).map((r) => r.id);
    if (toRestore.length > 0) await repo.update({ id: In(toRestore) }, { revokedAt: null });

    const known = new Set(existing.map((r) => r.siteId));
    const toAdd = siteIds.filter((siteId) => !known.has(siteId));
    if (toAdd.length > 0) await repo.save(toAdd.map((siteId) => repo.create({ userId, siteId })));
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
