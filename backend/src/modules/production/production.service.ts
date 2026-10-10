import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import type {
  ProductionBatchCreateDto,
  ProductionBatchQueryDto,
  ProductionConsumptionInputDto,
  ProductionDryingDto,
  ProductionFiringDto,
  ProductionMakingDto,
  ProductionSortingDto,
  ProductionStage,
} from '@brics/shared';
import { BusinessRuleException } from '../../common/exceptions/business-rule.exception';
import { IdempotencyService } from '../../common/idempotency/idempotency.service';
import type { Paginated } from '../../common/interceptors/response-envelope.interceptor';
import { Site } from '../company/entities/site.entity';
import { AuditService } from '../audit/audit.service';
import { Party } from '../parties/entities/party.entity';
import { BrickType } from '../inventory/entities/brick-type.entity';
import { Item } from '../inventory/entities/item.entity';
import { StockService } from '../../stock/stock.service';
import { ProductionBatch } from './entities/production-batch.entity';
import { ProductionConsumption } from './entities/production-consumption.entity';
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
    private readonly idempotency: IdempotencyService,
    private readonly dataSource: DataSource,
  ) {}

  // ---- Batches --------------------------------------------------------------

  async createBatch(
    companyId: string,
    userId: string,
    dto: ProductionBatchCreateDto,
    idempotencyKey: string | null = null,
  ): Promise<ProductionBatch> {
    return this.dataSource.transaction((manager) =>
      this.idempotency.runOnce(
        manager,
        {
          companyId,
          userId,
          endpoint: 'POST /production/batches',
          key: idempotencyKey,
          body: dto,
        },
        async () => {
          const site = await manager.findOne(Site, { where: { id: dto.siteId, companyId } });
          if (!site) throw new NotFoundException('That kiln does not exist');

          const existing = await manager.findOne(ProductionBatch, {
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

          const batch = await manager.save(
            manager.create(ProductionBatch, {
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

          await this.audit.record(
            {
              companyId,
              userId,
              action: 'CREATE',
              entityName: 'production_batches',
              entityId: batch.id,
              after: { siteId: batch.siteId, chamber: batch.chamber, batchDate: batch.batchDate },
            },
            manager,
          );

          return batch;
        },
      ),
    );
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
  ): Promise<{
    batch: ProductionBatch;
    entries: ProductionEntry[];
    outputs: ProductionSortingOutput[];
    consumptions: ProductionConsumption[];
  }> {
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

    const entryIds = entries.map((e) => e.id);
    const consumptions =
      entryIds.length > 0
        ? await this.dataSource
            .getRepository(ProductionConsumption)
            .createQueryBuilder('c')
            .where('c.company_id = :companyId', { companyId })
            .andWhere('c.deleted_at IS NULL')
            .andWhere('c.entry_id IN (:...entryIds)', { entryIds })
            .getMany()
        : [];

    return { batch, entries, outputs, consumptions };
  }

  // ---- Stage entries --------------------------------------------------------

  async recordMaking(
    companyId: string,
    userId: string,
    batchId: string,
    dto: ProductionMakingDto,
    idempotencyKey: string | null = null,
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

    this.assertConsumptionShape(dto.consumption);

    return this.dataSource.transaction((manager) =>
      this.idempotency.runOnce(
        manager,
        {
          companyId,
          userId,
          endpoint: 'POST /production/batches/:id/making',
          key: idempotencyKey,
          body: { batchId, ...dto },
        },
        async () => {
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

          const consumptions = await this.recordConsumptions(manager, {
            companyId,
            userId,
            batch,
            entry,
            inputs: dto.consumption,
            stageLabel: 'making',
          });

          await this.audit.record(
            {
              companyId,
              userId,
              action: 'CREATE',
              entityName: 'production_entries',
              entityId: entry.id,
              after: {
                batchId: batch.id,
                stage: 'making',
                greenBricks: entry.greenBricks,
                consumption: consumptions.map((c) => ({
                  itemId: c.itemId,
                  warehouseId: c.warehouseId,
                  quantity: c.quantity,
                })),
              },
            },
            manager,
          );

          return entry;
        },
      ),
    );
  }

  async recordDrying(
    companyId: string,
    userId: string,
    batchId: string,
    dto: ProductionDryingDto,
    idempotencyKey: string | null = null,
  ): Promise<ProductionEntry> {
    return this.dataSource.transaction((manager) =>
      this.idempotency.runOnce(
        manager,
        {
          companyId,
          userId,
          endpoint: 'POST /production/batches/:id/drying',
          key: idempotencyKey,
          body: { batchId, ...dto },
        },
        async () => {
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
        },
      ),
    );
  }

  async recordFiring(
    companyId: string,
    userId: string,
    batchId: string,
    dto: ProductionFiringDto,
    idempotencyKey: string | null = null,
  ): Promise<ProductionEntry> {
    this.assertConsumptionShape(dto.consumption);

    return this.dataSource.transaction((manager) =>
      this.idempotency.runOnce(
        manager,
        {
          companyId,
          userId,
          endpoint: 'POST /production/batches/:id/firing',
          key: idempotencyKey,
          body: { batchId, ...dto },
        },
        async () => {
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

          const consumptions = await this.recordConsumptions(manager, {
            companyId,
            userId,
            batch,
            entry,
            inputs: dto.consumption,
            stageLabel: 'firing',
          });

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
              after: {
                batchId: batch.id,
                stage: 'firing',
                firedBricks: entry.firedBricks,
                consumption: consumptions.map((c) => ({
                  itemId: c.itemId,
                  warehouseId: c.warehouseId,
                  quantity: c.quantity,
                })),
              },
            },
            manager,
          );

          return entry;
        },
      ),
    );
  }

  async recordSorting(
    companyId: string,
    userId: string,
    batchId: string,
    dto: ProductionSortingDto,
    idempotencyKey: string | null = null,
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

    return this.dataSource.transaction((manager) =>
      this.idempotency.runOnce(
        manager,
        {
          companyId,
          userId,
          endpoint: 'POST /production/batches/:id/sorting',
          key: idempotencyKey,
          body: { batchId, ...dto },
        },
        async () => {
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
        },
      ),
    );
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

  /**
   * PRD-04 — write one stock OUT movement per consumption input (in the
   * caller's transaction) and a matching `production_consumptions` row linking
   * the stage entry to it. If any row fails — missing item, wrong tenant,
   * wrong category, insufficient stock — the whole stage rolls back; a stage
   * that saved cannot leave the yard pretending nothing moved.
   */
  private async recordConsumptions(
    manager: EntityManager,
    args: {
      companyId: string;
      userId: string;
      batch: ProductionBatch;
      entry: ProductionEntry;
      inputs: ProductionConsumptionInputDto[];
      stageLabel: string;
    },
  ): Promise<ProductionConsumption[]> {
    const rows: ProductionConsumption[] = [];
    for (const input of args.inputs) {
      const item = await manager.findOne(Item, { where: { id: input.itemId, companyId: args.companyId } });
      if (!item) {
        throw new BusinessRuleException(
          'PRODUCTION_CONSUMPTION_ITEM_NOT_FOUND',
          'That raw material does not exist in this company',
        );
      }
      if (!item.isActive) {
        throw new BusinessRuleException('PRODUCTION_CONSUMPTION_ITEM_INACTIVE', `${item.name} is no longer in use`);
      }
      if (item.category !== 'raw_material') {
        throw new BusinessRuleException(
          'PRODUCTION_CONSUMPTION_ITEM_INVALID',
          `${item.name} is not a raw material — only raw materials are consumed at a stage`,
        );
      }

      const movement = await this.stock.record(manager, {
        companyId: args.companyId,
        userId: args.userId,
        warehouseId: input.warehouseId,
        itemId: input.itemId,
        movementType: 'production',
        direction: 'out',
        quantity: toQuantity(input.quantity),
        movementDate: args.entry.entryDate,
        sourceType: 'production_batch',
        sourceId: args.batch.id,
        notes: `Consumed at ${args.stageLabel} of ${args.batch.chamber} on ${args.batch.batchDate}`,
      });

      const row = await manager.save(
        manager.create(ProductionConsumption, {
          companyId: args.companyId,
          createdBy: args.userId,
          updatedBy: args.userId,
          entryId: args.entry.id,
          itemId: input.itemId,
          warehouseId: input.warehouseId,
          quantity: toQuantity(input.quantity),
          stockMovementId: movement.id,
        }),
      );
      rows.push(row);
    }
    return rows;
  }

  /** The partial unique in the DB stops duplicates eventually; this fails loudly first. */
  private assertConsumptionShape(inputs: ProductionConsumptionInputDto[]): void {
    const seen = new Set<string>();
    for (const row of inputs) {
      const key = `${row.itemId}|${row.warehouseId}`;
      if (seen.has(key)) {
        throw new BusinessRuleException(
          'PRODUCTION_CONSUMPTION_DUPLICATE',
          'The same item from the same warehouse may appear only once per stage — combine the quantities',
        );
      }
      seen.add(key);
    }
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
