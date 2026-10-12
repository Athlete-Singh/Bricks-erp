import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { Decimal } from 'decimal.js';
import { Money } from '../../common/money/money';
import { BusinessRuleException } from '../../common/exceptions/business-rule.exception';
import { todayCalendarDate } from '../../common/time/calendar-date';
import { PostingService } from '../../accounting/posting.service';
import { AuditService } from '../audit/audit.service';
import { IdempotencyService } from '../../common/idempotency/idempotency.service';
import { Party } from '../parties/entities/party.entity';
import { Site } from '../company/entities/site.entity';
import { FinancialYear } from '../company/entities/financial-year.entity';
import { Ledger } from '../../accounting/entities/ledger.entity';
import { LabourGroup } from './entities/labour-group.entity';
import { LabourWageAccrual } from './entities/labour-wage-accrual.entity';
import { Worker } from './entities/worker.entity';
import { LabourAttendance } from './entities/labour-attendance.entity';
import { LabourAdvance } from './entities/labour-advance.entity';
import { LabourDeduction } from './entities/labour-deduction.entity';
import { LabourSettlement } from './entities/labour-settlement.entity';
import { WageRate } from './entities/wage-rate.entity';
import {
  WageActivity,
  type CreateLabourGroupDto,
  type UpdateLabourGroupDto,
  type CreateWorkerDto,
  type UpdateWorkerDto,
  type CreateAttendanceDto,
  type CreateAdvanceDto,
  type CreateDeductionDto,
  type CreateSettlementDto,
  type AccrueWagesDto,
  type AttendanceQueryDto,
  type AdvanceQueryDto,
  type DeductionQueryDto,
  type SettlementQueryDto,
  type ExposureSummaryQueryDto,
} from '@brics/shared';

export interface AdvanceExposureResult {
  sardarPartyId: string;
  sardarName: string;
  advancesDrawn: string;
  wagesEarned: string;
  deductionsTotal: string;
  netExposure: string;
  isExposed: boolean;
  warning?: string | null;
}

export interface CreateAdvanceResult {
  advance: LabourAdvance;
  exposure: AdvanceExposureResult;
  warning?: string | null;
}

function assertNotFuture(date: string, label: string): void {
  const today = todayCalendarDate();
  if (date > today) {
    throw new BusinessRuleException('LABOUR_DATE_IN_FUTURE', `${label} cannot be dated after today (${today})`);
  }
}

@Injectable()
export class LabourService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly posting: PostingService,
    private readonly audit: AuditService,
    private readonly idempotency: IdempotencyService,
  ) {}

  // ── GROUPS ──────────────────────────────────────────────────────────────────

  async createGroup(companyId: string, userId: string, dto: CreateLabourGroupDto): Promise<LabourGroup> {
    return this.dataSource.transaction(async (manager) => {
      await this.assertSardarBelongsToCompany(manager, companyId, dto.sardarPartyId);
      if (dto.siteId) {
        await this.assertSiteBelongsToCompany(manager, companyId, dto.siteId);
      }

      const existing = await manager.findOne(LabourGroup, {
        where: { companyId, name: dto.name.trim() },
      });
      if (existing) {
        throw new UnprocessableEntityException(`A labour group with name "${dto.name}" already exists`);
      }

      const group = manager.create(LabourGroup, {
        companyId,
        siteId: dto.siteId ?? null,
        sardarPartyId: dto.sardarPartyId,
        name: dto.name.trim(),
        activity: dto.activity,
        isActive: dto.isActive ?? true,
        createdBy: userId,
        updatedBy: userId,
      });

      const saved = await manager.save(group);
      await this.audit.record(
        {
          companyId,
          userId,
          action: 'CREATE',
          entityName: 'labour_groups',
          entityId: saved.id,
          after: { name: saved.name, activity: saved.activity, sardarPartyId: saved.sardarPartyId },
        },
        manager,
      );
      return saved;
    });
  }

  async findAllGroups(companyId: string, query: { siteId?: string; sardarPartyId?: string; isActive?: boolean }) {
    const qb = this.dataSource
      .getRepository(LabourGroup)
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.sardarParty', 'sardar')
      .leftJoinAndSelect('g.site', 'site')
      .where('g.companyId = :companyId', { companyId })
      .andWhere('g.deletedAt IS NULL');

    if (query.siteId) qb.andWhere('g.siteId = :siteId', { siteId: query.siteId });
    if (query.sardarPartyId) qb.andWhere('g.sardarPartyId = :sardarPartyId', { sardarPartyId: query.sardarPartyId });
    if (query.isActive !== undefined) qb.andWhere('g.isActive = :isActive', { isActive: query.isActive });

    return qb.orderBy('g.name', 'ASC').getMany();
  }

  async updateGroup(companyId: string, userId: string, id: string, dto: UpdateLabourGroupDto): Promise<LabourGroup> {
    return this.dataSource.transaction(async (manager) => {
      const group = await manager.findOne(LabourGroup, { where: { id, companyId } });
      if (!group) throw new NotFoundException('Labour group not found');

      if (dto.sardarPartyId) {
        await this.assertSardarBelongsToCompany(manager, companyId, dto.sardarPartyId);
        group.sardarPartyId = dto.sardarPartyId;
      }
      if (dto.siteId !== undefined) {
        if (dto.siteId) await this.assertSiteBelongsToCompany(manager, companyId, dto.siteId);
        group.siteId = dto.siteId ?? null;
      }
      if (dto.name) group.name = dto.name.trim();
      if (dto.activity) group.activity = dto.activity;
      if (dto.isActive !== undefined) group.isActive = dto.isActive;
      group.updatedBy = userId;

      const saved = await manager.save(group);
      await this.audit.record(
        {
          companyId,
          userId,
          action: 'UPDATE',
          entityName: 'labour_groups',
          entityId: saved.id,
          after: { name: saved.name, activity: saved.activity, isActive: saved.isActive },
        },
        manager,
      );
      return saved;
    });
  }

  // ── WORKERS ─────────────────────────────────────────────────────────────────

  async createWorker(companyId: string, userId: string, dto: CreateWorkerDto): Promise<Worker> {
    return this.dataSource.transaction(async (manager) => {
      const group = await manager.findOne(LabourGroup, { where: { id: dto.labourGroupId, companyId } });
      if (!group) throw new NotFoundException('Labour group not found');

      const worker = manager.create(Worker, {
        companyId,
        labourGroupId: dto.labourGroupId,
        name: dto.name.trim(),
        phone: dto.phone ?? null,
        dailyWageRate: dto.dailyWageRate ? Money.toString(dto.dailyWageRate) : null,
        isActive: dto.isActive ?? true,
        createdBy: userId,
        updatedBy: userId,
      });

      const saved = await manager.save(worker);
      await this.audit.record(
        {
          companyId,
          userId,
          action: 'CREATE',
          entityName: 'workers',
          entityId: saved.id,
          after: { name: saved.name, labourGroupId: saved.labourGroupId },
        },
        manager,
      );
      return saved;
    });
  }

  async findAllWorkers(companyId: string, query: { labourGroupId?: string; isActive?: boolean }) {
    const qb = this.dataSource
      .getRepository(Worker)
      .createQueryBuilder('w')
      .leftJoinAndSelect('w.labourGroup', 'g')
      .where('w.companyId = :companyId', { companyId })
      .andWhere('w.deletedAt IS NULL');

    if (query.labourGroupId) qb.andWhere('w.labourGroupId = :labourGroupId', { labourGroupId: query.labourGroupId });
    if (query.isActive !== undefined) qb.andWhere('w.isActive = :isActive', { isActive: query.isActive });

    return qb.orderBy('w.name', 'ASC').getMany();
  }

  async updateWorker(companyId: string, userId: string, id: string, dto: UpdateWorkerDto): Promise<Worker> {
    return this.dataSource.transaction(async (manager) => {
      const worker = await manager.findOne(Worker, { where: { id, companyId } });
      if (!worker) throw new NotFoundException('Worker not found');

      if (dto.labourGroupId) {
        const group = await manager.findOne(LabourGroup, { where: { id: dto.labourGroupId, companyId } });
        if (!group) throw new NotFoundException('Labour group not found');
        worker.labourGroupId = dto.labourGroupId;
      }
      if (dto.name) worker.name = dto.name.trim();
      if (dto.phone !== undefined) worker.phone = dto.phone ?? null;
      if (dto.dailyWageRate !== undefined) {
        worker.dailyWageRate = dto.dailyWageRate ? Money.toString(dto.dailyWageRate) : null;
      }
      if (dto.isActive !== undefined) worker.isActive = dto.isActive;
      worker.updatedBy = userId;

      const saved = await manager.save(worker);
      await this.audit.record(
        {
          companyId,
          userId,
          action: 'UPDATE',
          entityName: 'workers',
          entityId: saved.id,
          after: { name: saved.name, isActive: saved.isActive },
        },
        manager,
      );
      return saved;
    });
  }

  // ── ATTENDANCE ──────────────────────────────────────────────────────────────

  async recordAttendance(
    companyId: string,
    userId: string,
    dto: CreateAttendanceDto,
    idempotencyKey: string | null = null,
  ): Promise<LabourAttendance[]> {
    assertNotFuture(dto.date, 'Attendance');

    return this.dataSource.transaction(async (manager) =>
      this.idempotency.runOnce(
        manager,
        {
          companyId,
          userId,
          endpoint: 'POST /labour/attendance',
          key: idempotencyKey,
          body: dto,
        },
        async () => {
          await this.assertSiteBelongsToCompany(manager, companyId, dto.siteId);
          const group = await manager.findOne(LabourGroup, { where: { id: dto.labourGroupId, companyId } });
          if (!group) throw new NotFoundException('Labour group not found');

          const saved: LabourAttendance[] = [];
          for (const entry of dto.entries) {
            if (entry.workerId) {
              const worker = await manager.findOne(Worker, {
                where: { id: entry.workerId, labourGroupId: dto.labourGroupId, companyId },
              });
              if (!worker) {
                throw new NotFoundException(`Worker ${entry.workerId} not found in this group`);
              }
            }

            const attendance = manager.create(LabourAttendance, {
              companyId,
              siteId: dto.siteId,
              date: dto.date,
              labourGroupId: dto.labourGroupId,
              workerId: entry.workerId ?? null,
              status: entry.status,
              overtimeHours: entry.overtimeHours ? Money.toString(entry.overtimeHours) : '0.00',
              remarks: entry.remarks ?? null,
              createdBy: userId,
              updatedBy: userId,
            });

            saved.push(await manager.save(attendance));
          }

          await this.audit.record(
            {
              companyId,
              userId,
              action: 'CREATE',
              entityName: 'labour_attendance',
              entityId: group.id,
              after: { date: dto.date, labourGroupId: dto.labourGroupId, count: saved.length },
            },
            manager,
          );

          return saved;
        },
      ),
    );
  }

  async findAllAttendance(companyId: string, query: AttendanceQueryDto) {
    const qb = this.dataSource
      .getRepository(LabourAttendance)
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.worker', 'w')
      .leftJoinAndSelect('a.labourGroup', 'g')
      .where('a.companyId = :companyId', { companyId })
      .andWhere('a.deletedAt IS NULL');

    if (query.siteId) qb.andWhere('a.siteId = :siteId', { siteId: query.siteId });
    if (query.labourGroupId) qb.andWhere('a.labourGroupId = :labourGroupId', { labourGroupId: query.labourGroupId });
    if (query.workerId) qb.andWhere('a.workerId = :workerId', { workerId: query.workerId });
    if (query.date) qb.andWhere('a.date = :date', { date: query.date });
    if (query.from) qb.andWhere('a.date >= :from', { from: query.from });
    if (query.to) qb.andWhere('a.date <= :to', { to: query.to });

    return qb.orderBy('a.date', 'DESC').addOrderBy('w.name', 'ASC').getMany();
  }

  // ── ADVANCES (LAB-05 & LEK-03) ─────────────────────────────────────────────

  async createAdvance(
    companyId: string,
    userId: string,
    dto: CreateAdvanceDto,
    idempotencyKey: string | null = null,
  ): Promise<CreateAdvanceResult> {
    assertNotFuture(dto.date, 'An advance');

    return this.dataSource.transaction(async (manager) =>
      this.idempotency.runOnce(
        manager,
        {
          companyId,
          userId,
          endpoint: 'POST /labour/advances',
          key: idempotencyKey,
          body: dto,
        },
        async () => {
          await this.assertSiteBelongsToCompany(manager, companyId, dto.siteId);
          const sardar = await this.assertSardarBelongsToCompany(manager, companyId, dto.sardarPartyId);

          if (new Decimal(dto.amount).lessThanOrEqualTo(0)) {
            throw new UnprocessableEntityException('Advance amount must be positive');
          }

          // Post Journal / Payment via PostingService
          const postedVoucher = await this.posting.post(manager, {
            companyId,
            userId,
            voucherTypeCode: 'payment',
            voucherDate: dto.date,
            siteId: dto.siteId,
            narration: dto.remarks ?? `Advance to Sardar ${sardar.name}`,
            sourceType: 'labour_advance',
            lines: [
              {
                ledgerId: sardar.ledgerId,
                debit: Money.toString(dto.amount),
                credit: '0.00',
                partyId: sardar.id,
                siteId: dto.siteId,
              },
              {
                ledgerId: dto.cashBankLedgerId,
                debit: '0.00',
                credit: Money.toString(dto.amount),
                siteId: dto.siteId,
              },
            ],
          });

          const advance = manager.create(LabourAdvance, {
            companyId,
            siteId: dto.siteId,
            fyId: postedVoucher.voucher.financialYearId,
            sardarPartyId: dto.sardarPartyId,
            workerId: dto.workerId ?? null,
            date: dto.date,
            amount: Money.toString(dto.amount),
            paymentMode: dto.paymentMode,
            cashBankLedgerId: dto.cashBankLedgerId,
            voucherId: postedVoucher.voucher.id,
            remarks: dto.remarks ?? null,
            createdBy: userId,
            updatedBy: userId,
          });

          const savedAdvance = await manager.save(advance);

          // Recalculate exposure after save
          const exposureAfter = await this.getAdvanceExposureInternal(manager, companyId, dto.sardarPartyId);

          await this.audit.record(
            {
              companyId,
              userId,
              action: 'CREATE',
              entityName: 'labour_advances',
              entityId: savedAdvance.id,
              after: {
                sardarPartyId: savedAdvance.sardarPartyId,
                amount: savedAdvance.amount,
                netExposure: exposureAfter.netExposure,
              },
            },
            manager,
          );

          return {
            advance: savedAdvance,
            exposure: exposureAfter,
            warning: exposureAfter.warning,
          };
        },
      ),
    );
  }

  async findAllAdvances(companyId: string, query: AdvanceQueryDto) {
    const qb = this.dataSource
      .getRepository(LabourAdvance)
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.sardarParty', 's')
      .leftJoinAndSelect('a.worker', 'w')
      .where('a.companyId = :companyId', { companyId })
      .andWhere('a.deletedAt IS NULL');

    if (query.siteId) qb.andWhere('a.siteId = :siteId', { siteId: query.siteId });
    if (query.sardarPartyId) qb.andWhere('a.sardarPartyId = :sardarPartyId', { sardarPartyId: query.sardarPartyId });
    if (query.workerId) qb.andWhere('a.workerId = :workerId', { workerId: query.workerId });
    if (query.from) qb.andWhere('a.date >= :from', { from: query.from });
    if (query.to) qb.andWhere('a.date <= :to', { to: query.to });

    return qb.orderBy('a.date', 'DESC').addOrderBy('a.createdAt', 'DESC').getMany();
  }

  // ── DEDUCTIONS (LAB-06) ────────────────────────────────────────────────────

  async createDeduction(companyId: string, userId: string, dto: CreateDeductionDto): Promise<LabourDeduction> {
    assertNotFuture(dto.date, 'A deduction');

    return this.dataSource.transaction(async (manager) => {
      await this.assertSiteBelongsToCompany(manager, companyId, dto.siteId);
      await this.assertSardarBelongsToCompany(manager, companyId, dto.sardarPartyId);

      const deduction = manager.create(LabourDeduction, {
        companyId,
        siteId: dto.siteId,
        sardarPartyId: dto.sardarPartyId,
        workerId: dto.workerId ?? null,
        date: dto.date,
        category: dto.category,
        amount: Money.toString(dto.amount),
        remarks: dto.remarks ?? null,
        createdBy: userId,
        updatedBy: userId,
      });

      const saved = await manager.save(deduction);
      await this.audit.record(
        {
          companyId,
          userId,
          action: 'CREATE',
          entityName: 'labour_deductions',
          entityId: saved.id,
          after: { sardarPartyId: saved.sardarPartyId, category: saved.category, amount: saved.amount },
        },
        manager,
      );
      return saved;
    });
  }

  async findAllDeductions(companyId: string, query: DeductionQueryDto) {
    const qb = this.dataSource
      .getRepository(LabourDeduction)
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.sardarParty', 's')
      .leftJoinAndSelect('d.worker', 'w')
      .where('d.companyId = :companyId', { companyId })
      .andWhere('d.deletedAt IS NULL');

    if (query.siteId) qb.andWhere('d.siteId = :siteId', { siteId: query.siteId });
    if (query.sardarPartyId) qb.andWhere('d.sardarPartyId = :sardarPartyId', { sardarPartyId: query.sardarPartyId });
    if (query.workerId) qb.andWhere('d.workerId = :workerId', { workerId: query.workerId });
    if (query.category) qb.andWhere('d.category = :category', { category: query.category });
    if (query.from) qb.andWhere('d.date >= :from', { from: query.from });
    if (query.to) qb.andWhere('d.date <= :to', { to: query.to });

    return qb.orderBy('d.date', 'DESC').addOrderBy('d.createdAt', 'DESC').getMany();
  }

  // ── LEK-03 LIVE ADVANCE EXPOSURE ──────────────────────────────────────────

  async getAdvanceExposure(companyId: string, sardarPartyId: string): Promise<AdvanceExposureResult> {
    return this.getAdvanceExposureInternal(this.dataSource.manager, companyId, sardarPartyId);
  }

  async getExposureSummary(companyId: string, query?: ExposureSummaryQueryDto): Promise<AdvanceExposureResult[]> {
    const sardars = await this.dataSource
      .getRepository(Party)
      .createQueryBuilder('p')
      .where('p.companyId = :companyId', { companyId })
      .andWhere(':sardar = ANY(p.partyTypes)', { sardar: 'sardar' })
      .andWhere('p.deletedAt IS NULL')
      .orderBy('p.name', 'ASC')
      .getMany();

    const results: AdvanceExposureResult[] = [];
    for (const s of sardars) {
      const exp = await this.getAdvanceExposureInternal(this.dataSource.manager, companyId, s.id);
      if (!query?.onlyExposed || exp.isExposed) {
        results.push(exp);
      }
    }

    results.sort((a, b) => new Decimal(b.netExposure).minus(new Decimal(a.netExposure)).toNumber());
    return results;
  }

  private async getAdvanceExposureInternal(
    manager: EntityManager,
    companyId: string,
    sardarPartyId: string,
  ): Promise<AdvanceExposureResult> {
    const sardar = await this.assertSardarBelongsToCompany(manager, companyId, sardarPartyId);

    // Sum advances
    const advancesRes = await manager
      .createQueryBuilder(LabourAdvance, 'a')
      .select('SUM(a.amount)', 'total')
      .where('a.companyId = :companyId AND a.sardarPartyId = :sardarPartyId AND a.deletedAt IS NULL', {
        companyId,
        sardarPartyId,
      })
      .getRawOne<{ total?: string }>();
    const advancesDrawn = advancesRes?.total ? new Decimal(advancesRes.total) : new Decimal(0);

    // Sum deductions
    const deductionsRes = await manager
      .createQueryBuilder(LabourDeduction, 'd')
      .select('SUM(d.amount)', 'total')
      .where('d.companyId = :companyId AND d.sardarPartyId = :sardarPartyId AND d.deletedAt IS NULL', {
        companyId,
        sardarPartyId,
      })
      .getRawOne<{ total?: string }>();
    const deductionsTotal = deductionsRes?.total ? new Decimal(deductionsRes.total) : new Decimal(0);

    // Dynamic wage rate lookup (ADR-018)
    const makingWageRate = await manager.findOne(WageRate, {
      where: { companyId, activity: WageActivity.MAKING, isActive: true },
      order: { effectiveFrom: 'DESC' },
    });
    const ratePer1000 = makingWageRate?.rateAmount ? new Decimal(makingWageRate.rateAmount) : new Decimal(650);

    // Sum wages earned (production entries attached to sardar)
    const productionRes = await manager.query<{ green?: string }[]>(
      `SELECT SUM(e.green_bricks) as green
       FROM production_entries e
       JOIN production_batches b ON b.id = e.batch_id
       WHERE b.company_id = $1 AND e.sardar_party_id = $2 AND e.deleted_at IS NULL`,
      [companyId, sardarPartyId],
    );
    const greenBricks = productionRes?.[0]?.green ? new Decimal(productionRes[0].green) : new Decimal(0);
    const pieceRateWages = greenBricks.dividedBy(1000).times(ratePer1000);

    // Attendance daily wages for workers in Sardar's groups
    const attendanceRes = await manager.query<{ totalDailyWages?: string }[]>(
      `SELECT SUM(
         CASE 
           WHEN a.status = 'present' THEN COALESCE(w.daily_wage_rate, 0)
           WHEN a.status = 'half_day' THEN COALESCE(w.daily_wage_rate, 0) * 0.5
           ELSE 0
         END
       ) as "totalDailyWages"
       FROM labour_attendance a
       JOIN workers w ON w.id = a.worker_id
       JOIN labour_groups g ON g.id = a.labour_group_id
       WHERE g.company_id = $1 AND g.sardar_party_id = $2 AND a.deleted_at IS NULL AND w.deleted_at IS NULL`,
      [companyId, sardarPartyId],
    );
    const dailyWages = attendanceRes?.[0]?.totalDailyWages
      ? new Decimal(attendanceRes[0].totalDailyWages)
      : new Decimal(0);

    const wagesEarned = pieceRateWages.plus(dailyWages);
    const netExposure = advancesDrawn.minus(wagesEarned).minus(deductionsTotal);
    const isExposed = netExposure.greaterThan(0);

    const warning = isExposed
      ? `Warning: Sardar ${sardar.name} has unsecured advance exposure of ₹${netExposure.toFixed(2)} (Advances drawn: ₹${advancesDrawn.toFixed(2)}, Wages earned: ₹${wagesEarned.toFixed(2)}, Deductions: ₹${deductionsTotal.toFixed(2)}).`
      : null;

    return {
      sardarPartyId,
      sardarName: sardar.name,
      advancesDrawn: Money.toString(advancesDrawn.toFixed(2)),
      wagesEarned: Money.toString(wagesEarned.toFixed(2)),
      deductionsTotal: Money.toString(deductionsTotal.toFixed(2)),
      netExposure: Money.toString(netExposure.toFixed(2)),
      isExposed,
      warning,
    };
  }

  // ── AUTO WAGE ACCRUAL (LAB-04) ──────────────────────────────────────────────

  async accrueWages(
    companyId: string,
    userId: string,
    dto: AccrueWagesDto,
    idempotencyKey: string | null = null,
  ): Promise<{ voucherId: string; voucherNumber: string; grossWages: string; narration: string }> {
    assertNotFuture(dto.date, 'Wage accrual date');

    return this.dataSource.transaction(async (manager) =>
      this.idempotency.runOnce(
        manager,
        {
          companyId,
          userId,
          endpoint: 'POST /labour/accrue-wages',
          key: idempotencyKey,
          body: dto,
        },
        async () => {
          await this.assertSiteBelongsToCompany(manager, companyId, dto.siteId);
          const sardar = await this.assertSardarBelongsToCompany(manager, companyId, dto.sardarPartyId);

          // The same work must not be paid for twice. An `Idempotency-Key`
          // only catches an identical retry; a second genuine request, or one
          // whose range merely overlaps, used to post the whole amount again.
          const overlapping = await manager
            .createQueryBuilder(LabourWageAccrual, 'a')
            .where('a.company_id = :companyId', { companyId })
            .andWhere('a.sardar_party_id = :sardarPartyId', { sardarPartyId: dto.sardarPartyId })
            .andWhere('a.deleted_at IS NULL')
            .andWhere('a.period_from <= :periodTo AND a.period_to >= :periodFrom', {
              periodFrom: dto.periodFrom,
              periodTo: dto.periodTo,
            })
            .getOne();
          if (overlapping) {
            throw new BusinessRuleException(
              'WAGES_ALREADY_ACCRUED',
              `Wages for ${sardar.name} covering ${overlapping.periodFrom} to ${overlapping.periodTo} were already accrued. Correct that entry instead of accruing again.`,
            );
          }

          const makingWageRate = await manager.findOne(WageRate, {
            where: { companyId, activity: WageActivity.MAKING, isActive: true },
            order: { effectiveFrom: 'DESC' },
          });
          if (!makingWageRate?.rateAmount) {
            // Falling back to an invented rate silently priced a whole season's
            // piece work at a number nobody had agreed to.
            throw new BusinessRuleException(
              'WAGE_RATE_NOT_SET',
              'No active making wage rate is configured. Set one under Masters → Wage Rates before accruing wages.',
            );
          }
          const ratePer1000 = new Decimal(makingWageRate.rateAmount);

          const prodRes = await manager.query<{ green?: string }[]>(
            `SELECT SUM(e.green_bricks) as green
             FROM production_entries e
             JOIN production_batches b ON b.id = e.batch_id
             WHERE b.company_id = $1 
               AND e.sardar_party_id = $2 
               AND e.entry_date >= $3 
               AND e.entry_date <= $4
               AND e.deleted_at IS NULL`,
            [companyId, dto.sardarPartyId, dto.periodFrom, dto.periodTo],
          );
          const greenCount = prodRes?.[0]?.green ? new Decimal(prodRes[0].green) : new Decimal(0);
          const pieceWages = greenCount.dividedBy(1000).times(ratePer1000);

          const attRes = await manager.query<{ totalDailyWages?: string }[]>(
            `SELECT SUM(
               CASE 
                 WHEN a.status = 'present' THEN COALESCE(w.daily_wage_rate, 0)
                 WHEN a.status = 'half_day' THEN COALESCE(w.daily_wage_rate, 0) * 0.5
                 ELSE 0
               END
             ) as "totalDailyWages"
             FROM labour_attendance a
             JOIN workers w ON w.id = a.worker_id
             JOIN labour_groups g ON g.id = a.labour_group_id
             WHERE g.company_id = $1 
               AND g.sardar_party_id = $2 
               AND a.date >= $3 
               AND a.date <= $4
               AND a.deleted_at IS NULL AND w.deleted_at IS NULL`,
            [companyId, dto.sardarPartyId, dto.periodFrom, dto.periodTo],
          );
          const dailyWages = attRes?.[0]?.totalDailyWages ? new Decimal(attRes[0].totalDailyWages) : new Decimal(0);

          const totalEarned = pieceWages.plus(dailyWages);
          if (totalEarned.lessThanOrEqualTo(0)) {
            throw new BusinessRuleException(
              'NO_WAGES_TO_ACCRUE',
              `No production or attendance wages found for Sardar ${sardar.name} between ${dto.periodFrom} and ${dto.periodTo}`,
            );
          }

          const grossWages = Money.toString(totalEarned.toFixed(2));

          const wagesLedger = await manager.findOne(Ledger, {
            where: { companyId, code: 'LABOUR_WAGES' },
          });
          if (!wagesLedger) {
            throw new NotFoundException('Labour Wages expense ledger not found for company');
          }

          const narration =
            dto.remarks ??
            `Wage accrual for Sardar ${sardar.name} from ${dto.periodFrom} to ${dto.periodTo} (Gross: ₹${grossWages})`;

          const posted = await this.posting.post(manager, {
            companyId,
            userId,
            voucherTypeCode: 'journal',
            voucherDate: dto.date,
            siteId: dto.siteId,
            narration,
            sourceType: 'labour_wage_accrual',
            lines: [
              {
                ledgerId: wagesLedger.id,
                debit: grossWages,
                credit: '0.00',
                siteId: dto.siteId,
              },
              {
                ledgerId: sardar.ledgerId,
                debit: '0.00',
                credit: grossWages,
                partyId: sardar.id,
                siteId: dto.siteId,
              },
            ],
          });

          // Written in the same transaction as the journal: an accrual that
          // posted but left no record would be payable twice, and a record with
          // no journal would owe money that never reached the books.
          await manager.save(
            manager.create(LabourWageAccrual, {
              companyId,
              createdBy: userId,
              updatedBy: userId,
              siteId: dto.siteId,
              sardarPartyId: dto.sardarPartyId,
              periodFrom: dto.periodFrom,
              periodTo: dto.periodTo,
              grossWages,
              voucherId: posted.voucher.id,
            }),
          );

          await this.audit.record(
            {
              companyId,
              userId,
              action: 'CREATE',
              entityName: 'labour_wage_accruals',
              entityId: posted.voucher.id,
              after: {
                sardarPartyId: dto.sardarPartyId,
                periodFrom: dto.periodFrom,
                periodTo: dto.periodTo,
                grossWages,
                voucherId: posted.voucher.id,
              },
            },
            manager,
          );

          return {
            voucherId: posted.voucher.id,
            voucherNumber: posted.voucher.number,
            grossWages,
            narration,
          };
        },
      ),
    );
  }

  // ── SETTLEMENTS (LAB-07) ───────────────────────────────────────────────────

  async createSettlement(
    companyId: string,
    userId: string,
    dto: CreateSettlementDto,
    idempotencyKey: string | null = null,
  ): Promise<LabourSettlement> {
    assertNotFuture(dto.periodTo, 'Settlement period');

    return this.dataSource.transaction(async (manager) =>
      this.idempotency.runOnce(
        manager,
        {
          companyId,
          userId,
          endpoint: 'POST /labour/settlements',
          key: idempotencyKey,
          body: dto,
        },
        async () => {
          await this.assertSiteBelongsToCompany(manager, companyId, dto.siteId);
          const sardar = await this.assertSardarBelongsToCompany(manager, companyId, dto.sardarPartyId);

          const exposure = await this.getAdvanceExposureInternal(manager, companyId, dto.sardarPartyId);
          const grossWages = exposure.wagesEarned;
          const advancesRecovered = Money.toString(dto.advancesRecovered);
          const deductions = Money.toString(dto.deductions);

          const netPayableNum = new Decimal(grossWages)
            .minus(new Decimal(advancesRecovered))
            .minus(new Decimal(deductions));

          if (netPayableNum.isNegative()) {
            throw new UnprocessableEntityException('Net payable cannot be negative in a settlement');
          }
          const netPayable = Money.toString(netPayableNum.toFixed(2));

          let voucherId: string | null = null;
          let fyId: string;

          if (dto.paymentMode && dto.cashBankLedgerId && netPayableNum.greaterThan(0)) {
            const posted = await this.posting.post(manager, {
              companyId,
              userId,
              voucherTypeCode: 'payment',
              voucherDate: dto.periodTo,
              siteId: dto.siteId,
              narration: dto.remarks ?? `Settlement payout for Sardar ${sardar.name}`,
              sourceType: 'labour_settlement',
              lines: [
                {
                  ledgerId: sardar.ledgerId,
                  debit: netPayable,
                  credit: '0.00',
                  partyId: sardar.id,
                  siteId: dto.siteId,
                },
                {
                  ledgerId: dto.cashBankLedgerId,
                  debit: '0.00',
                  credit: netPayable,
                  siteId: dto.siteId,
                },
              ],
            });
            voucherId = posted.voucher.id;
            fyId = posted.voucher.financialYearId;
          } else {
            const fy = await manager.findOne(FinancialYear, { where: { companyId, isActive: true } });
            if (!fy) throw new NotFoundException('Active financial year not found');
            fyId = fy.id;
          }

          const settlement = manager.create(LabourSettlement, {
            companyId,
            siteId: dto.siteId,
            fyId,
            sardarPartyId: dto.sardarPartyId,
            periodFrom: dto.periodFrom,
            periodTo: dto.periodTo,
            grossWages,
            advancesRecovered,
            deductions,
            netPayable,
            status: voucherId ? 'paid' : 'draft',
            voucherId,
            remarks: dto.remarks ?? null,
            createdBy: userId,
            updatedBy: userId,
          });

          const saved = await manager.save(settlement);
          await this.audit.record(
            {
              companyId,
              userId,
              action: 'CREATE',
              entityName: 'labour_settlements',
              entityId: saved.id,
              after: {
                sardarPartyId: saved.sardarPartyId,
                netPayable: saved.netPayable,
                status: saved.status,
              },
            },
            manager,
          );
          return saved;
        },
      ),
    );
  }

  async findAllSettlements(companyId: string, query: SettlementQueryDto) {
    const qb = this.dataSource
      .getRepository(LabourSettlement)
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.sardarParty', 'sardar')
      .where('s.companyId = :companyId', { companyId })
      .andWhere('s.deletedAt IS NULL');

    if (query.siteId) qb.andWhere('s.siteId = :siteId', { siteId: query.siteId });
    if (query.sardarPartyId) qb.andWhere('s.sardarPartyId = :sardarPartyId', { sardarPartyId: query.sardarPartyId });
    if (query.status) qb.andWhere('s.status = :status', { status: query.status });
    if (query.from) qb.andWhere('s.periodFrom >= :from', { from: query.from });
    if (query.to) qb.andWhere('s.periodTo <= :to', { to: query.to });

    return qb.orderBy('s.periodTo', 'DESC').addOrderBy('s.createdAt', 'DESC').getMany();
  }

  async findSettlementById(companyId: string, id: string): Promise<LabourSettlement> {
    const settlement = await this.dataSource
      .getRepository(LabourSettlement)
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.sardarParty', 'sardar')
      .where('s.companyId = :companyId AND s.id = :id', { companyId, id })
      .andWhere('s.deletedAt IS NULL')
      .getOne();

    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }
    return settlement;
  }

  // ── ASSERTIONS ─────────────────────────────────────────────────────────────

  private async assertSardarBelongsToCompany(
    manager: EntityManager,
    companyId: string,
    partyId: string,
  ): Promise<Party> {
    const party = await manager.findOne(Party, { where: { id: partyId, companyId } });
    if (!party) {
      throw new NotFoundException(`Party ${partyId} not found`);
    }
    if (!party.partyTypes.includes('sardar')) {
      throw new UnprocessableEntityException(`Party ${party.name} is not a Sardar`);
    }
    return party;
  }

  private async assertSiteBelongsToCompany(manager: EntityManager, companyId: string, siteId: string): Promise<Site> {
    const site = await manager.findOne(Site, { where: { id: siteId, companyId } });
    if (!site) {
      throw new NotFoundException(`Site ${siteId} not found`);
    }
    return site;
  }
}
