import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { HsnRate } from './entities/hsn-rate.entity';
import { AuditService } from '../audit/audit.service';
import { CreateHsnRateDto, UpdateHsnRateDto } from '@brics/shared';

@Injectable()
export class TaxesService {
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

  async createHsnRate(companyId: string, userId: string, dto: CreateHsnRateDto) {
    return this.em.transaction(async (manager) => {
      const hsnRate = manager.create(HsnRate, {
        companyId,
        createdBy: userId,
        updatedBy: userId,
        hsnCode: dto.hsnCode,
        description: dto.description ?? null,
        cgstRate: dto.cgstRate ?? 0,
        sgstRate: dto.sgstRate ?? 0,
        igstRate: dto.igstRate ?? 0,
        isActive: dto.isActive ?? true,
      });

      await manager.save(hsnRate);

      await this.audit.record(
        {
          companyId,
          userId,
          action: 'CREATE',
          entityName: 'tax_hsn_rates',
          entityId: hsnRate.id,
          after: this.diffable(hsnRate),
        },
        manager,
      );

      return hsnRate;
    });
  }

  async updateHsnRate(companyId: string, userId: string, id: string, dto: UpdateHsnRateDto) {
    return this.em.transaction(async (manager) => {
      const hsnRate = await manager.findOne(HsnRate, {
        where: { id, companyId },
      });

      if (!hsnRate) throw new NotFoundException('HSN rate not found');

      const oldValues = { ...hsnRate };

      if (dto.hsnCode !== undefined) hsnRate.hsnCode = dto.hsnCode;
      if (dto.description !== undefined) hsnRate.description = dto.description ?? null;
      if (dto.cgstRate !== undefined) hsnRate.cgstRate = dto.cgstRate ?? 0;
      if (dto.sgstRate !== undefined) hsnRate.sgstRate = dto.sgstRate ?? 0;
      if (dto.igstRate !== undefined) hsnRate.igstRate = dto.igstRate ?? 0;
      if (dto.isActive !== undefined) hsnRate.isActive = dto.isActive;

      hsnRate.updatedBy = userId;

      await manager.save(hsnRate);

      await this.audit.record(
        {
          companyId,
          userId,
          action: 'UPDATE',
          entityName: 'tax_hsn_rates',
          entityId: hsnRate.id,
          before: this.diffable(oldValues),
          after: this.diffable(hsnRate),
        },
        manager,
      );

      return hsnRate;
    });
  }

  async listHsnRates(companyId: string) {
    return this.em.find(HsnRate, {
      where: { companyId },
      order: { hsnCode: 'ASC' },
    });
  }
}
