import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { WageRate } from './entities/wage-rate.entity';
import { AuditService } from '../audit/audit.service';
import { CreateWageRateDto, UpdateWageRateDto, MasterQueryDto } from '@brics/shared';

@Injectable()
export class WageRatesService {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly audit: AuditService,
  ) {}

  private diffable(entity: unknown): Record<string, unknown> {
    const raw = entity as Record<string, unknown>;
    const copy = { ...raw };
    delete copy.id;
    delete copy.companyId;
    delete copy.createdAt;
    delete copy.updatedAt;
    delete copy.createdBy;
    delete copy.updatedBy;
    return copy;
  }

  async createWageRate(companyId: string, userId: string, dto: CreateWageRateDto) {
    return this.em.transaction(async (manager) => {
      const wageRate = manager.create(WageRate, {
        companyId,
        createdBy: userId,
        updatedBy: userId,
        activity: dto.activity,
        unit: dto.unit,
        rateAmount: dto.rateAmount,
        ...(dto.effectiveFrom ? { effectiveFrom: dto.effectiveFrom } : {}),
        isActive: dto.isActive ?? true,
      });

      await manager.save(wageRate);

      await this.audit.record(
        {
          companyId,
          userId,
          action: 'CREATE',
          entityName: 'labour_wage_rates',
          entityId: wageRate.id,
          after: this.diffable(wageRate),
        },
        manager,
      );

      return wageRate;
    });
  }

  async updateWageRate(companyId: string, userId: string, id: string, dto: UpdateWageRateDto) {
    return this.em.transaction(async (manager) => {
      const wageRate = await manager.findOne(WageRate, {
        where: { id, companyId },
      });

      if (!wageRate) throw new NotFoundException('Wage rate not found');

      const oldValues = { ...wageRate };

      if (dto.activity !== undefined) wageRate.activity = dto.activity;
      if (dto.unit !== undefined) wageRate.unit = dto.unit;
      if (dto.rateAmount !== undefined) wageRate.rateAmount = dto.rateAmount;
      if (dto.effectiveFrom !== undefined) wageRate.effectiveFrom = dto.effectiveFrom;
      if (dto.isActive !== undefined) wageRate.isActive = dto.isActive;

      wageRate.updatedBy = userId;

      await manager.save(wageRate);

      await this.audit.record(
        {
          companyId,
          userId,
          action: 'UPDATE',
          entityName: 'labour_wage_rates',
          entityId: wageRate.id,
          before: this.diffable(oldValues),
          after: this.diffable(wageRate),
        },
        manager,
      );

      return wageRate;
    });
  }

  async listWageRates(companyId: string, query: MasterQueryDto) {
    const qb = this.em.createQueryBuilder(WageRate, 'w').where('w.companyId = :companyId', { companyId });
    if (query.search) qb.andWhere('w.activity ILIKE :search', { search: `%${query.search}%` });
    if (query.isActive !== undefined) qb.andWhere('w.isActive = :isActive', { isActive: query.isActive });

    const total = await qb.getCount();
    const items = await qb
      .orderBy('w.activity', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getMany();

    return { items, meta: { page: query.page, limit: query.limit, total } };
  }
}
