import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import type {
  ProductionBatchCreateDto,
  ProductionBatchQueryDto,
  ProductionDryingDto,
  ProductionFiringDto,
  ProductionMakingDto,
  ProductionSortingDto,
  ProductionStage,
} from '@brics/shared';
import { BusinessRuleException } from '../../common/exceptions/business-rule.exception';
import type { Paginated } from '../../common/interceptors/response-envelope.interceptor';
import { Site } from '../company/entities/site.entity';
import { AuditService } from '../audit/audit.service';
import { Party } from '../parties/entities/party.entity';
import { BrickType } from '../inventory/entities/brick-type.entity';
import { StockService } from '../../stock/stock.service';
import { ProductionBatch } from './entities/production-batch.entity';
import { ProductionEntry } from './entities/production-entry.entity';
import { ProductionSortingOutput } from './entities/production-sorting-output.entity';

Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

/** Order a batch's stages must come in. Each stage is recorded exactly once. */
const STAGE_PREREQUISITES: Record<ProductionStage, ProductionStage | null> = {
  making: null,
  drying: 'making',
  firing: 'making', // drying is a date marker only, so firing needs making not drying
  sorting: 'firing',
};

function toQuantity(value: Decimal.Value): string {
  return new Decimal(value).toFixed(3);
}

/**
 * PRD-02…05, LEK-01 writes.
 *
 * Sorting is the one path that moves stock: good bricks per grade go in via
 * `StockService` **in the same transaction** as the sorting entry — a sort
 * that saved but left no stock movement, or a stock movement with no sort,
 * would both be corruption no later report could detect.
 */
@Injectable()
export class ProductionService {
  constructor(
    @InjectRepository(ProductionBatch) private readonly batchRepo: Repository<ProductionBatch>,
    @InjectRepository(ProductionEntry) private readonly entryRepo: Repository<ProductionEntry>,
    @InjectRepository(Site) private readonly siteRepo: Repository<Site>,
    @InjectRepository(Party) private readonly partyRepo: Repository<Party>,
    @InjectRepository(BrickType) private readonly brickTypeRepo: Repository<BrickType>,
    private readonly stock: StockService,
    private readonly audit: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  // ---- Batches --------------------------------------------------------------

  async createBatch(companyId: string, userId: string, dto: ProductionBatchCreateDto): Promise<ProductionBatch> {
    const site = await this.siteRepo.findOne({ where: { id: dto.siteId, companyId } });
    if (!site) throw new NotFoundException('That kiln does not exist');

    const existing = await this.batchRepo.findOne({
      where: {
        companyId,
        siteId: dto.siteId,
        chamber: dto.chamber,
        batchDate: dto.batchDate,
      },
    });
    if (existing) {
      throw new BusinessRuleException(
        'PRODUCTION_BATCH_DUPLICATE',
        `A batch already exists for ${dto.chamber} on ${dto.batchDate}`,
      );
    }

    const batch = await this.batchRepo.save(
      this.batchRepo.create({
        companyId,
        createdBy: userId,
        updatedBy: userId,
        siteId: dto.siteId,
        chamber: dto.chamber,
        batchDate: dto.batchDate,
        status: 'open',
        notes: dto.notes ?? null,
      }),
    );

    await this.audit.record({
      companyId,
      userId,
      action: 'CREATE',
      entityName: 'production_batches',
      entityId: batch.id,
      after: { siteId: batch.siteId, chamber: batch.chamber, batchDate: batch.batchDate },
    });

    return batch;
  }

  async listBatches(companyId: string, query: ProductionBatchQueryDto): Promise<Paginated<ProductionBatch>> {
    const qb = this.batchRepo
      .createQueryBuilder('b')
      .where('b.company_id = :companyId', { companyId })
      .andWhere('b.deleted_at IS NULL');

    if (query.siteId) qb.andWhere('b.site_id = :siteId', { siteId: query.siteId });
    if (query.chamber) qb.andWhere('b.chamber = :chamber', { chamber: query.chamber });
    if (query.status) qb.andWhere('b.status = :status', { status: query.status });
    if (query.from) qb.andWhere('b.batch_date >= :from', { from: query.from });
    if (query.to) qb.andWhere('b.batch_date <= :to', { to: query.to });

    qb.orderBy('b.batch_date', 'DESC').addOrderBy('b.chamber', 'ASC');

    const total = await qb.getCount();
    const items = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getMany();

    return { items, meta: { page: query.page, limit: query.limit, total } };
  }

  async getBatch(
    companyId: string,
    batchId: string,
  ): Promise<{ batch: ProductionBatch; entries: ProductionEntry[]; outputs: ProductionSortingOutput[] }> {
    const batch = await this.batchRepo.findOne({ where: { id: batchId, companyId } });
    if (!batch) throw new NotFoundException('That batch does not exist');

    const entries = await this.entryRepo.find({
      where: { batchId, companyId },
      order: { entryDate: 'ASC' },
    });

    const sortingEntry = entries.find((e) => e.stage === 'sorting');
    const outputs = sortingEntry
      ? await this.dataSource
          .getRepository(ProductionSortingOutput)
          .find({ where: { entryId: sortingEntry.id, companyId } })
      : [];

    return { batch, entries, outputs };
  }

  // ---- Stage entries --------------------------------------------------------

  async recordMaking(
    companyId: string,
    userId: string,
    batchId: string,
    dto: ProductionMakingDto,
  ): Promise<ProductionEntry> {
    if (dto.sardarPartyId) {
      const party = await this.partyRepo.findOne({ where: { id: dto.sardarPartyId, companyId } });
      if (!party) throw new NotFoundException('That Sardar does not exist');
      if (!party.partyTypes.includes('sardar')) {
        throw new BusinessRuleException(
          'PRODUCTION_SARDAR_INVALID',
          `${party.name} is not a Sardar — pick a party whose type includes Sardar`,
        );
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const batch = await this.loadBatchForWrite(manager, companyId, batchId);
      await this.assertStageOrder(manager, batch.id, 'making');

      const entry = await manager.save(
        manager.create(ProductionEntry, {
          companyId,
          createdBy: userId,
          updatedBy: userId,
          batchId: batch.id,
          stage: 'making',
          entryDate: dto.entryDate,
          greenBricks: toQuantity(dto.greenBricks),
          firedBricks: '0.000',
          brokenBricks: '0.000',
          rejectBricks: '0.000',
          sardarPartyId: dto.sardarPartyId ?? null,
          warehouseId: null,
          notes: dto.notes ?? null,
        }),
      );

      await this.audit.record(
        {
          companyId,
          userId,
          action: 'CREATE',
          entityName: 'production_entries',
          entityId: entry.id,
          after: { batchId: batch.id, stage: 'making', greenBricks: entry.greenBricks },
        },
        manager,
      );

      return entry;
    });
  }

  async recordDrying(
    companyId: string,
    userId: string,
    batchId: string,
    dto: ProductionDryingDto,
  ): Promise<ProductionEntry> {
    return this.dataSource.transaction(async (manager) => {
      const batch = await this.loadBatchForWrite(manager, companyId, batchId);
      await this.assertStageOrder(manager, batch.id, 'drying');

      const entry = await manager.save(
        manager.create(ProductionEntry, {
          companyId,
          createdBy: userId,
          updatedBy: userId,
          batchId: batch.id,
          stage: 'drying',
          entryDate: dto.entryDate,
          greenBricks: '0.000',
          firedBricks: '0.000',
          brokenBricks: '0.000',
          rejectBricks: '0.000',
          sardarPartyId: null,
          warehouseId: null,
          notes: dto.notes ?? null,
        }),
      );

      await this.audit.record(
        {
          companyId,
          userId,
          action: 'CREATE',
          entityName: 'production_entries',
          entityId: entry.id,
          after: { batchId: batch.id, stage: 'drying' },
        },
        manager,
      );

      return entry;
    });
  }

  async recordFiring(
    companyId: string,
    userId: string,
    batchId: string,
    dto: ProductionFiringDto,
  ): Promise<ProductionEntry> {
    return this.dataSource.transaction(async (manager) => {
      const batch = await this.loadBatchForWrite(manager, companyId, batchId);
      await this.assertStageOrder(manager, batch.id, 'firing');

      const entry = await manager.save(
        manager.create(ProductionEntry, {
          companyId,
          createdBy: userId,
          updatedBy: userId,
          batchId: batch.id,
          stage: 'firing',
          entryDate: dto.entryDate,
          greenBricks: '0.000',
          firedBricks: toQuantity(dto.firedBricks),
          brokenBricks: '0.000',
          rejectBricks: '0.000',
          sardarPartyId: null,
          warehouseId: null,
          notes: dto.notes ?? null,
        }),
      );

      // open → firing. Sorting flips it to 'sorted'.
      if (batch.status === 'open') {
        batch.status = 'firing';
        batch.updatedBy = userId;
        await manager.save(batch);
      }

      await this.audit.record(
        {
          companyId,
          userId,
          action: 'CREATE',
          entityName: 'production_entries',
          entityId: entry.id,
          after: { batchId: batch.id, stage: 'firing', firedBricks: entry.firedBricks },
        },
        manager,
      );

      return entry;
    });
  }

  async recordSorting(
    companyId: string,
    userId: string,
    batchId: string,
    dto: ProductionSortingDto,
  ): Promise<{
    entry: ProductionEntry;
    outputs: ProductionSortingOutput[];
  }> {
    // Validate up front, outside the tx, so an obviously-bad request fails fast.
    if (dto.outputs.length === 0) {
      throw new BusinessRuleException('PRODUCTION_SORTING_EMPTY', 'List at least one good brick grade');
    }
    const seen = new Set<string>();
    for (const out of dto.outputs) {
      if (seen.has(out.brickTypeId)) {
        throw new BusinessRuleException(
          'PRODUCTION_SORTING_DUPLICATE_GRADE',
          'Each grade may appear once per sorting entry — combine the quantities',
        );
      }
      seen.add(out.brickTypeId);
    }

    return this.dataSource.transaction(async (manager) => {
      const batch = await this.loadBatchForWrite(manager, companyId, batchId);
      await this.assertStageOrder(manager, batch.id, 'sorting');

      // Confirm every grade belongs to this company before the stock loop, so
      // a mis-tenanted id is a 422 that undoes nothing, not a half-committed
      // sort.
      const grades = await manager.find(BrickType, {
        where: { id: In(dto.outputs.map((o) => o.brickTypeId)), companyId },
      });
      if (grades.length !== seen.size) {
        throw new BusinessRuleException(
          'BRICK_TYPE_NOT_FOUND',
          'One of the brick grades does not exist in this company',
        );
      }
      for (const g of grades) {
        if (!g.isActive) {
          throw new BusinessRuleException('BRICK_TYPE_INACTIVE', `${g.grade} is no longer in use`);
        }
      }

      const entry = await manager.save(
        manager.create(ProductionEntry, {
          companyId,
          createdBy: userId,
          updatedBy: userId,
          batchId: batch.id,
          stage: 'sorting',
          entryDate: dto.entryDate,
          greenBricks: '0.000',
          firedBricks: '0.000',
          brokenBricks: toQuantity(dto.brokenBricks),
          rejectBricks: toQuantity(dto.rejectBricks),
          sardarPartyId: null,
          warehouseId: dto.warehouseId,
          notes: dto.notes ?? null,
        }),
      );

      const outputs: ProductionSortingOutput[] = [];
      for (const out of dto.outputs) {
        // One stock movement per grade, same transaction. `StockService.record`
        // checks the warehouse/grade/company and refuses negative quantities.
        const movement = await this.stock.record(manager, {
          companyId,
          userId,
          warehouseId: dto.warehouseId,
          brickTypeId: out.brickTypeId,
          movementType: 'production',
          direction: 'in',
          quantity: toQuantity(out.quantity),
          movementDate: dto.entryDate,
          sourceType: 'production_batch',
          sourceId: batch.id,
          notes: `Sorted from ${batch.chamber} on ${batch.batchDate}`,
        });

        const output = await manager.save(
          manager.create(ProductionSortingOutput, {
            companyId,
            createdBy: userId,
            updatedBy: userId,
            entryId: entry.id,
            brickTypeId: out.brickTypeId,
            quantity: toQuantity(out.quantity),
            stockMovementId: movement.id,
          }),
        );
        outputs.push(output);
      }

      batch.status = 'sorted';
      batch.updatedBy = userId;
      await manager.save(batch);

      const goodTotal = outputs.reduce((acc, o) => acc.plus(new Decimal(o.quantity)), new Decimal(0)).toFixed(3);

      await this.audit.record(
        {
          companyId,
          userId,
          action: 'CREATE',
          entityName: 'production_entries',
          entityId: entry.id,
          after: {
            batchId: batch.id,
            stage: 'sorting',
            goodTotal,
            brokenBricks: entry.brokenBricks,
            rejectBricks: entry.rejectBricks,
            outputs: outputs.map((o) => ({ brickTypeId: o.brickTypeId, quantity: o.quantity })),
          },
        },
        manager,
      );

      return { entry, outputs };
    });
  }

  // ---- Helpers --------------------------------------------------------------

  /** Loads the batch under a row lock to serialise stage inserts against it. */
  private async loadBatchForWrite(
    manager: EntityManager,
    companyId: string,
    batchId: string,
  ): Promise<ProductionBatch> {
    const batch = await manager
      .createQueryBuilder(ProductionBatch, 'b')
      .where('b.id = :id', { id: batchId })
      .andWhere('b.company_id = :companyId', { companyId })
      .andWhere('b.deleted_at IS NULL')
      .setLock('pessimistic_write')
      .getOne();
    if (!batch) throw new NotFoundException('That batch does not exist');
    if (batch.status === 'closed') {
      throw new BusinessRuleException('PRODUCTION_BATCH_CLOSED', 'This batch is closed');
    }
    return batch;
  }

  private async assertStageOrder(manager: EntityManager, batchId: string, stage: ProductionStage): Promise<void> {
    const existing = await manager.find(ProductionEntry, {
      where: { batchId },
      select: ['stage'],
    });
    const stages = new Set(existing.map((e) => e.stage));

    if (stages.has(stage)) {
      throw new BusinessRuleException(
        'PRODUCTION_STAGE_DUPLICATE',
        `This batch already has a ${stage} entry — reverse the existing one instead`,
      );
    }

    const prereq = STAGE_PREREQUISITES[stage];
    if (prereq && !stages.has(prereq)) {
      throw new BusinessRuleException(
        'PRODUCTION_STAGE_OUT_OF_ORDER',
        `Record ${prereq} first — a batch is not ready to be ${stage}d`,
      );
    }
  }
}
