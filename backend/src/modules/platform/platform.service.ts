import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, EntityManager, Repository } from 'typeorm';
import type {
  CreateTenantDto,
  TenantSummaryDto,
  TenantStatus,
  TenantDetailDto,
  UpdateTenantSettingsDto,
} from '@brics/shared';
import { ChartOfAccountsService } from '../../accounting/chart-of-accounts.service';
import { AuditService } from '../audit/audit.service';
import { MembershipService } from '../auth/membership.service';
import { RolesService } from '../auth/roles.service';
import { User } from '../auth/entities/user.entity';
import { Company } from '../company/entities/company.entity';
import { FinancialYear } from '../company/entities/financial-year.entity';

interface CreateTenantResult {
  company: Company;
  owner: User;
  financialYear: FinancialYear;
}

/**
 * The SaaS surface's own service (S1.1). Everything here is cross-tenant on
 * purpose — the vendor onboards, suspends and reactivates. Business reads of a
 * tenant's data do not belong here; they come later through a support session.
 */
@Injectable()
export class PlatformService {
  constructor(
    @InjectRepository(Company) private companyRepo: Repository<Company>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectDataSource() private dataSource: DataSource,
    private roles: RolesService,
    private membership: MembershipService,
    private chartOfAccounts: ChartOfAccountsService,
    private audit: AuditService,
  ) {}

  async listTenants(): Promise<TenantSummaryDto[]> {
    const companies = await this.companyRepo.find({ order: { createdAt: 'DESC' } });
    return companies.map((c) => this.toSummary(c));
  }

  /**
   * PLT-09 (S3.1) — returns full tenant metadata, high-level document counts,
   * assigned users and registered kilns/sites. Strictly honours the metadata
   * boundary: counts and dates only, never monetary balances or private ledger lines.
   */
  async getTenant(id: string): Promise<TenantDetailDto> {
    const company = await this.companyRepo.findOneBy({ id });
    if (!company) {
      throw new NotFoundException('Tenant not found');
    }

    // Query assigned users with their roles for this company
    const userRows: Array<{
      id: string;
      name: string;
      email: string | null;
      mobile: string;
      role_code: string;
      role_name: string;
      is_active: boolean;
      created_at: Date | string;
    }> = await this.dataSource.query(
      `SELECT u.id, u.name, u.email, u.mobile, r.code AS role_code, r.name AS role_name, u.is_active, u.created_at
       FROM "user_companies" uc
       INNER JOIN "users" u ON u.id = uc.user_id
       INNER JOIN "roles" r ON r.id = uc.role_id
       WHERE uc.company_id = $1
       ORDER BY u.created_at ASC`,
      [id],
    );

    // Query registered sites (kilns/depots) for this company
    const siteRows: Array<{
      id: string;
      name: string;
      code: string;
      type: string;
      is_active: boolean;
      created_at: Date | string;
    }> = await this.dataSource.query(
      `SELECT id, name, code, type, is_active, created_at
       FROM "sites"
       WHERE company_id = $1 AND deleted_at IS NULL
       ORDER BY name ASC`,
      [id],
    );

    interface CountRow {
      count: number;
    }
    interface AuditRow {
      last_active: string | Date | null;
    }

    // Document counts + last active fallback from audit_logs
    const vouchersRes = await this.dataSource.query<CountRow[]>(
      `SELECT COUNT(*)::int AS count FROM "vouchers" WHERE "company_id" = $1 AND "deleted_at" IS NULL`,
      [id],
    );

    const invoicesRes = await this.dataSource.query<CountRow[]>(
      `SELECT COUNT(*)::int AS count FROM "sales_invoices" WHERE "company_id" = $1 AND "deleted_at" IS NULL`,
      [id],
    );

    const auditRes = company.lastActiveAt
      ? []
      : await this.dataSource.query<AuditRow[]>(
          `SELECT MAX(created_at) AS last_active FROM "audit_logs" WHERE "company_id" = $1`,
          [id],
        );

    const auditDate = auditRes[0]?.last_active;
    const rawLastActive: Date | string | null = company.lastActiveAt ?? (auditDate ? new Date(auditDate) : null);

    const vouchersCount = vouchersRes[0]?.count ?? 0;
    const invoicesCount = invoicesRes[0]?.count ?? 0;

    return {
      ...this.toSummary(company),
      gstin: company.gstin ?? null,
      lastActiveAt: rawLastActive
        ? typeof rawLastActive === 'string'
          ? rawLastActive
          : rawLastActive.toISOString()
        : null,
      counts: {
        users: userRows.length,
        kilns: siteRows.length,
        activeKilns: siteRows.filter((s) => s.is_active).length,
        vouchers: vouchersCount,
        salesInvoices: invoicesCount,
      },
      users: userRows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email ?? null,
        mobile: u.mobile,
        roleCode: u.role_code,
        roleName: u.role_name,
        isActive: Boolean(u.is_active),
        createdAt: new Date(u.created_at).toISOString(),
      })),
      kilns: siteRows.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        type: s.type,
        isActive: Boolean(s.is_active),
        createdAt: new Date(s.created_at).toISOString(),
      })),
    };
  }

  /**
   * PLT-05 — one transaction: company, chart of accounts, first financial year,
   * owner user, membership. If any step fails the whole thing rolls back, so a
   * half-created tenant can never appear in the list.
   *
   * The first FY is created here, not in `CompanyService.createCompany`, because
   * without an active FY the go-live import stops on its first row (see the
   * Resume block in PROGRESS.md).
   */
  async createTenant(actorId: string, dto: CreateTenantDto): Promise<CreateTenantResult> {
    const ownerRole = await this.roles.requireByCode('owner');
    await this.assertUserIdentifiersFree(dto.ownerMobile, dto.ownerEmail ?? null);

    return this.dataSource.transaction(async (manager) => {
      const company = await manager.save(
        manager.create(Company, {
          name: dto.companyName,
          stateCode: dto.stateCode,
          gstin: dto.gstin ?? null,
          planName: dto.planName ?? null,
          status: 'active' satisfies TenantStatus,
          createdBy: actorId,
          updatedBy: actorId,
        }),
      );

      // Chart first — later rows that post anything need the ledgers to exist.
      await this.chartOfAccounts.seedForCompany(company.id, manager);

      const fy = await this.createFirstFinancialYear(manager, company.id, actorId, dto);

      const owner = await manager.save(
        manager.create(User, {
          email: dto.ownerEmail ?? null,
          mobile: dto.ownerMobile,
          name: dto.ownerName,
          passwordHash: await bcrypt.hash(dto.ownerPassword, 10),
          isActive: true,
          isSuperAdmin: false,
          createdBy: actorId,
          updatedBy: actorId,
        }),
      );

      await this.membership.addMembership(owner.id, company.id, ownerRole.id, true, manager);

      await this.audit.record(
        {
          companyId: company.id,
          userId: actorId,
          entityName: 'companies',
          entityId: company.id,
          action: 'CREATE',
          after: {
            name: company.name,
            stateCode: company.stateCode,
            status: company.status,
            planName: company.planName,
          },
        },
        manager,
      );
      await this.audit.record(
        {
          companyId: company.id,
          userId: actorId,
          entityName: 'users',
          entityId: owner.id,
          action: 'CREATE',
          after: { name: owner.name, mobile: owner.mobile, roleCode: 'owner' },
        },
        manager,
      );

      return { company, owner, financialYear: fy };
    });
  }

  async suspendTenant(actorId: string, tenantId: string, reason?: string): Promise<TenantSummaryDto> {
    return this.setStatus(actorId, tenantId, 'suspended', reason);
  }

  async reactivateTenant(actorId: string, tenantId: string): Promise<TenantSummaryDto> {
    return this.setStatus(actorId, tenantId, 'active');
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private async setStatus(
    actorId: string,
    tenantId: string,
    nextStatus: TenantStatus,
    reason?: string,
  ): Promise<TenantSummaryDto> {
    const company = await this.companyRepo.findOneBy({ id: tenantId });
    if (!company) {
      throw new NotFoundException('Tenant not found');
    }
    if (company.status === nextStatus) {
      // Idempotent, but we do not write an audit row for a no-op.
      return this.toSummary(company);
    }
    const previous = company.status;
    company.status = nextStatus;
    company.updatedBy = actorId;
    const saved = await this.companyRepo.save(company);

    await this.audit.record({
      companyId: company.id,
      userId: actorId,
      entityName: 'companies',
      entityId: company.id,
      action: 'UPDATE',
      before: { status: previous },
      after: { status: nextStatus, reason: reason ?? null },
    });
    return this.toSummary(saved);
  }

  private async createFirstFinancialYear(
    manager: EntityManager,
    companyId: string,
    actorId: string,
    dto: CreateTenantDto,
  ): Promise<FinancialYear> {
    const supplied = dto.financialYear;
    const { name, startDate, endDate } = supplied ?? defaultIndianFinancialYear(new Date());
    if (endDate <= startDate) {
      throw new BadRequestException('Financial year endDate must be after startDate');
    }
    return manager.save(
      manager.create(FinancialYear, {
        companyId,
        name,
        startDate,
        endDate,
        isActive: true,
        isLocked: false,
        createdBy: actorId,
        updatedBy: actorId,
      }),
    );
  }

  private async assertUserIdentifiersFree(mobile: string, email: string | null): Promise<void> {
    const byMobile = await this.userRepo.findOne({ where: { mobile } });
    if (byMobile) {
      throw new ConflictException('A user with this mobile already exists');
    }
    if (email) {
      const byEmail = await this.userRepo.findOne({ where: { email } });
      if (byEmail) {
        throw new ConflictException('A user with this email already exists');
      }
    }
  }

  private toSummary(c: Company): TenantSummaryDto {
    return {
      id: c.id,
      name: c.name,
      stateCode: c.stateCode,
      status: c.status,
      planName: c.planName,
      trialEndsAt: c.trialEndsAt,
      lastActiveAt: c.lastActiveAt ? c.lastActiveAt.toISOString() : null,
      requireSupportApproval: Boolean(c.requireSupportApproval),
      supportAccessGrantedUntil: c.supportAccessGrantedUntil ? c.supportAccessGrantedUntil.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
    };
  }

  /**
   * PLT-10 (S3.2) — Update tenant platform settings (e.g. requireSupportApproval).
   */
  async updateTenantSettings(id: string, actorId: string, dto: UpdateTenantSettingsDto): Promise<TenantSummaryDto> {
    const company = await this.companyRepo.findOneBy({ id });
    if (!company) {
      throw new NotFoundException('Tenant not found');
    }

    const before = { requireSupportApproval: company.requireSupportApproval };
    if (dto.requireSupportApproval !== undefined) {
      company.requireSupportApproval = dto.requireSupportApproval;
    }
    company.updatedBy = actorId;
    const saved = await this.companyRepo.save(company);

    await this.audit.record({
      companyId: id,
      userId: actorId,
      entityName: 'companies',
      entityId: id,
      action: 'UPDATE',
      before,
      after: { requireSupportApproval: saved.requireSupportApproval },
    });

    return this.toSummary(saved);
  }
}

/**
 * The Indian financial year the given date falls in: 1 April → 31 March, labelled
 * `YYYY-YY` (the convention CONVENTIONS.md records). Used when the onboarding
 * form leaves the dates blank.
 */
export function defaultIndianFinancialYear(now: Date): { name: string; startDate: string; endDate: string } {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0 = Jan
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;
  const pad = (y: number) => String(y).padStart(4, '0');
  const yy = (y: number) => String(y % 100).padStart(2, '0');
  return {
    name: `${pad(startYear)}-${yy(endYear)}`,
    startDate: `${pad(startYear)}-04-01`,
    endDate: `${pad(endYear)}-03-31`,
  };
}
