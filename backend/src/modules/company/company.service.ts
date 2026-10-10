import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import type { CreateCompanyDto, CreateFinancialYearDto, CreateSiteDto, UpdateCompanyDto } from '@brics/shared';
import { AuditService } from '../audit/audit.service';
import { ChartOfAccountsService } from '../../accounting/chart-of-accounts.service';
import { MembershipService } from '../auth/membership.service';
import { applySince, deltaWatermark } from '../../common/sync/delta-pull';
import { RolesService } from '../auth/roles.service';
import { Company } from './entities/company.entity';
import { FinancialYear } from './entities/financial-year.entity';
import { Site } from './entities/site.entity';

/**
 * Companies are the tenant root. Every method here is scoped either by the
 * caller's membership (company-level reads) or by the company id taken from the
 * JWT (everything below a company). Nothing trusts a company id from the client.
 */
@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company) private companyRepo: Repository<Company>,
    @InjectRepository(Site) private siteRepo: Repository<Site>,
    @InjectRepository(FinancialYear) private fyRepo: Repository<FinancialYear>,
    private membership: MembershipService,
    private roles: RolesService,
    private audit: AuditService,
    private chartOfAccounts: ChartOfAccountsService,
    private dataSource: DataSource,
  ) {}

  // ── Companies ───────────────────────────────────────────────────────────────

  /** Only the companies this user belongs to — this is what the switcher lists. */
  async findCompaniesForUser(userId: string, isSuperAdmin = false): Promise<Company[]> {
    if (isSuperAdmin) {
      return this.companyRepo.find({ order: { name: 'ASC' } });
    }
    const companyIds = await this.membership.companyIdsFor(userId);
    if (companyIds.length === 0) return [];
    return this.companyRepo.find({ where: { id: In(companyIds) }, order: { name: 'ASC' } });
  }

  async findCompanyForUser(userId: string, companyId: string, isSuperAdmin = false): Promise<Company> {
    await this.membership.assertMember(userId, companyId, isSuperAdmin);
    return this.requireCompany(companyId);
  }

  /** The creator becomes an Owner of the new company, or it would be unreachable. */
  async createCompany(userId: string, dto: CreateCompanyDto): Promise<Company> {
    const ownerRole = await this.roles.requireByCode('owner');

    return this.dataSource.transaction(async (manager) => {
      const company = await manager.save(
        manager.create(Company, {
          name: dto.name,
          gstin: dto.gstin ?? null,
          pan: dto.pan ?? null,
          stateCode: dto.stateCode,
          address: dto.address ?? null,
          logoUrl: dto.logoUrl ?? null,
          gstScheme: dto.gstScheme ?? 'regular_12_itc',
          createdBy: userId,
          updatedBy: userId,
        }),
      );
      await this.membership.addMembership(userId, company.id, ownerRole.id, false, manager);
      // In the same transaction: a company without a chart of accounts has
      // nowhere to post, and would be a broken tenant from the first request.
      await this.chartOfAccounts.seedForCompany(company.id, manager);
      await this.audit.record(
        {
          companyId: company.id,
          userId,
          entityName: 'companies',
          entityId: company.id,
          action: 'CREATE',
          after: { name: company.name, gstin: company.gstin, stateCode: company.stateCode },
        },
        manager,
      );
      return company;
    });
  }

  async updateCompany(
    userId: string,
    companyId: string,
    dto: UpdateCompanyDto,
    isSuperAdmin = false,
  ): Promise<Company> {
    await this.membership.assertMember(userId, companyId, isSuperAdmin);
    const company = await this.requireCompany(companyId);
    const before = { ...company };
    Object.assign(company, dto, { updatedBy: userId });
    const saved = await this.companyRepo.save(company);
    await this.audit.record({
      companyId,
      userId,
      entityName: 'companies',
      entityId: companyId,
      action: 'UPDATE',
      before: this.diffable(before),
      after: this.diffable(saved),
    });
    return saved;
  }

  /** Only the fields worth keeping in the trail — no internals, no timestamps. */
  private diffable(company: Company): Record<string, unknown> {
    return {
      name: company.name,
      gstin: company.gstin,
      pan: company.pan,
      stateCode: company.stateCode,
      address: company.address,
      logoUrl: company.logoUrl,
      gstScheme: company.gstScheme,
      isActive: company.isActive,
    };
  }

  private async requireCompany(companyId: string): Promise<Company> {
    const company = await this.companyRepo.findOneBy({ id: companyId });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }

  // ── Sites / kilns (always the JWT tenant) ───────────────────────────────────

  async findSites(companyId: string): Promise<Site[]> {
    return this.siteRepo.find({ where: { companyId }, order: { name: 'ASC' } });
  }

  async createSite(companyId: string, userId: string, dto: CreateSiteDto): Promise<Site> {
    const duplicate = await this.siteRepo.findOne({ where: { companyId, code: dto.code } });
    if (duplicate) {
      throw new BadRequestException(`A kiln/site with code '${dto.code}' already exists`);
    }
    const site = this.siteRepo.create({
      companyId,
      name: dto.name,
      code: dto.code,
      type: dto.type,
      address: dto.address ?? null,
      createdBy: userId,
      updatedBy: userId,
    });
    const saved = await this.siteRepo.save(site);
    await this.audit.record({
      companyId,
      userId,
      entityName: 'sites',
      entityId: saved.id,
      action: 'CREATE',
      after: { name: saved.name, code: saved.code, type: saved.type },
    });
    return saved;
  }

  /** Site ids the user may act on: their granted sites, or all company sites. */
  async accessibleSites(companyId: string, userId: string): Promise<Site[]> {
    const grantedIds = await this.membership.siteIdsFor(userId);
    if (grantedIds.length === 0) {
      return this.findSites(companyId);
    }
    return this.siteRepo.find({ where: { companyId, id: In(grantedIds) }, order: { name: 'ASC' } });
  }

  /**
   * SYN-02 delta pull for the mobile kiln list. Returns the accessible kilns
   * touched at or after `since`, each row with a `deleted` flag so the mobile
   * reconciles its local store, plus the watermark it echoes back (ADR-034).
   */
  async accessibleSitesSince(
    companyId: string,
    userId: string,
    since: string,
  ): Promise<{ items: Array<Site & { deleted: boolean }>; meta: { nextSince: string } }> {
    const grantedIds = await this.membership.siteIdsFor(userId);
    const qb = this.siteRepo.createQueryBuilder('s').where('s.company_id = :companyId', { companyId });
    applySince(qb, 's', since);
    if (grantedIds.length > 0) {
      qb.andWhere('s.id IN (:...grantedIds)', { grantedIds });
    }
    const rows = await qb.getMany();
    const items = rows.map((s) => ({ ...s, deleted: s.deletedAt != null }));

    // Revoking a grant does not touch the kiln row, so the window above cannot
    // see it — the kiln would simply stop appearing and the device would keep
    // showing it and keep taking production against a kiln the user may no
    // longer use. Fetch the revocations separately and report them as what they
    // are from this device's point of view: the kiln is gone.
    // Only meaningful while the user still holds some grant, because no grants
    // at all means "every kiln of the company" (see `accessibleSites`).
    if (grantedIds.length > 0) {
      const revokedIds = (await this.membership.siteIdsRevokedSince(userId, since)).filter(
        (id) => !grantedIds.includes(id),
      );
      const alreadySent = new Set(items.map((s) => s.id));
      const missing = revokedIds.filter((id) => !alreadySent.has(id));
      if (missing.length > 0) {
        const revoked = await this.siteRepo.find({ where: { companyId, id: In(missing) }, withDeleted: true });
        items.push(...revoked.map((s) => ({ ...s, deleted: true })));
      }
    }

    return { items, meta: { nextSince: deltaWatermark(since, rows, false) } };
  }

  // ── Financial years (ADM-04) ────────────────────────────────────────────────

  async findFinancialYears(companyId: string): Promise<FinancialYear[]> {
    return this.fyRepo.find({ where: { companyId }, order: { startDate: 'DESC' } });
  }

  /** The first FY of a company becomes active; later ones must be activated explicitly. */
  async createFinancialYear(companyId: string, userId: string, dto: CreateFinancialYearDto): Promise<FinancialYear> {
    const existing = await this.fyRepo.count({ where: { companyId } });
    const overlapping = await this.fyRepo
      .createQueryBuilder('fy')
      .where('fy.company_id = :companyId', { companyId })
      .andWhere('fy.start_date <= :endDate AND fy.end_date >= :startDate', {
        startDate: dto.startDate,
        endDate: dto.endDate,
      })
      .getCount();
    if (overlapping > 0) {
      throw new BadRequestException('This period overlaps an existing financial year');
    }

    const fy = this.fyRepo.create({
      companyId,
      name: dto.name,
      startDate: dto.startDate,
      endDate: dto.endDate,
      isActive: existing === 0,
      isLocked: false,
      createdBy: userId,
      updatedBy: userId,
    });
    const saved = await this.fyRepo.save(fy);
    await this.audit.record({
      companyId,
      userId,
      entityName: 'financial_years',
      entityId: saved.id,
      action: 'CREATE',
      after: { name: saved.name, startDate: saved.startDate, endDate: saved.endDate, isActive: saved.isActive },
    });
    return saved;
  }

  /** Exactly one active FY per company, swapped in a single transaction. */
  async activateFinancialYear(companyId: string, userId: string, fyId: string): Promise<FinancialYear> {
    const fy = await this.fyRepo.findOne({ where: { id: fyId, companyId } });
    if (!fy) {
      throw new NotFoundException('Financial year not found');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.update(FinancialYear, { companyId }, { isActive: false });
      await manager.update(FinancialYear, { id: fyId }, { isActive: true, updatedBy: userId });
    });

    await this.audit.record({
      companyId,
      userId,
      entityName: 'financial_years',
      entityId: fyId,
      action: 'UPDATE',
      before: { isActive: fy.isActive },
      after: { isActive: true },
    });

    fy.isActive = true;
    return fy;
  }
}
