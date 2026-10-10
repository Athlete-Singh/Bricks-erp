import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type {
  CreateBrickTypeDto,
  CreateItemDto,
  CreateUnitDto,
  CreateWarehouseDto,
  InventoryMasterQueryDto,
  UpdateBrickTypeDto,
  UpdateItemDto,
  UpdateUnitDto,
  UpdateWarehouseDto,
} from '@brics/shared';
import { Unit } from './entities/unit.entity';
import { BrickType } from './entities/brick-type.entity';
import { Warehouse } from './entities/warehouse.entity';
import { Item } from './entities/item.entity';
import { Site } from '../company/entities/site.entity';
import { HsnRate } from '../taxes/entities/hsn-rate.entity';
import { AuditService } from '../audit/audit.service';
import { DataSource } from 'typeorm';
import {
  applySince,
  deltaMeta,
  withTombstone,
  type DeltaPageMeta,
  type WithTombstone,
} from '../../common/sync/delta-pull';

export interface Paginated<T> {
  items: T[];
  meta: DeltaPageMeta;
}

@Injectable()
export class InventoryMastersService {
  constructor(
    @InjectRepository(Unit) private unitRepo: Repository<Unit>,
    @InjectRepository(BrickType) private brickTypeRepo: Repository<BrickType>,
    @InjectRepository(Warehouse) private warehouseRepo: Repository<Warehouse>,
    @InjectRepository(Item) private itemRepo: Repository<Item>,
    private audit: AuditService,
    private dataSource: DataSource,
  ) {}

  // ── Units ─────────────────────────────────────────────────────────────────

  async createUnit(companyId: string, userId: string, dto: CreateUnitDto): Promise<Unit> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Unit);
      const unit = await repo.save(repo.create({ companyId, ...dto, createdBy: userId, updatedBy: userId }));
      await this.audit.record(
        { companyId, userId, entityName: 'units', entityId: unit.id, action: 'CREATE', after: this.diffable(unit) },
        manager,
      );
      return unit;
    });
  }

  async updateUnit(companyId: string, userId: string, id: string, dto: UpdateUnitDto): Promise<Unit> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Unit);
      const unit = await repo.findOne({ where: { id, companyId } });
      if (!unit) throw new NotFoundException('Unit not found');

      const oldValues = { ...unit };
      Object.assign(unit, dto, { updatedBy: userId });
      const updated = await repo.save(unit);

      await this.audit.record(
        {
          companyId,
          userId,
          entityName: 'units',
          entityId: unit.id,
          action: 'UPDATE',
          before: this.diffable(oldValues),
          after: this.diffable(updated),
        },
        manager,
      );
      return updated;
    });
  }

  async listUnits(companyId: string, query: InventoryMasterQueryDto): Promise<Paginated<WithTombstone<Unit>>> {
    const qb = this.unitRepo.createQueryBuilder('u').where('u.companyId = :companyId', { companyId });
    if (query.search) qb.andWhere('u.name ILIKE :search', { search: `%${query.search}%` });
    const delta = applySince(qb, 'u', query.since);
    // `isActive` is a filter for a human browsing the list. On a delta it would
    // hide the deactivation itself, which is this product's only retirement
    // signal — there are no DELETE endpoints (ADR-034).
    if (!delta && query.isActive !== undefined) {
      qb.andWhere('u.isActive = :isActive', { isActive: query.isActive });
    }
    if (!delta) qb.orderBy('u.createdAt', query.sort?.startsWith('-') ? 'DESC' : 'ASC');

    const [rows, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return {
      items: rows.map(withTombstone),
      meta: deltaMeta({ page: query.page, limit: query.limit, total }, query.since, rows),
    };
  }

  // ── Brick Types ───────────────────────────────────────────────────────────

  async createBrickType(companyId: string, userId: string, dto: CreateBrickTypeDto): Promise<BrickType> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(BrickType);
      const bt = await repo.save(repo.create({ companyId, ...dto, createdBy: userId, updatedBy: userId }));
      await this.audit.record(
        { companyId, userId, entityName: 'brick_types', entityId: bt.id, action: 'CREATE', after: this.diffable(bt) },
        manager,
      );
      return bt;
    });
  }

  async updateBrickType(companyId: string, userId: string, id: string, dto: UpdateBrickTypeDto): Promise<BrickType> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(BrickType);
      const bt = await repo.findOne({ where: { id, companyId } });
      if (!bt) throw new NotFoundException('Brick type not found');

      const oldValues = { ...bt };
      Object.assign(bt, dto, { updatedBy: userId });
      const updated = await repo.save(bt);

      await this.audit.record(
        {
          companyId,
          userId,
          entityName: 'brick_types',
          entityId: bt.id,
          action: 'UPDATE',
          before: this.diffable(oldValues),
          after: this.diffable(updated),
        },
        manager,
      );
      return updated;
    });
  }

  async listBrickTypes(
    companyId: string,
    query: InventoryMasterQueryDto,
  ): Promise<Paginated<WithTombstone<BrickType>>> {
    const qb = this.brickTypeRepo.createQueryBuilder('bt').where('bt.companyId = :companyId', { companyId });
    if (query.search) qb.andWhere('bt.grade ILIKE :search', { search: `%${query.search}%` });
    const delta = applySince(qb, 'bt', query.since);
    // `isActive` is a filter for a human browsing the list. On a delta it would
    // hide the deactivation itself, which is this product's only retirement
    // signal — there are no DELETE endpoints (ADR-034).
    if (!delta && query.isActive !== undefined) {
      qb.andWhere('bt.isActive = :isActive', { isActive: query.isActive });
    }
    if (!delta) qb.orderBy('bt.createdAt', query.sort?.startsWith('-') ? 'DESC' : 'ASC');

    const [rows, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return {
      items: rows.map(withTombstone),
      meta: deltaMeta({ page: query.page, limit: query.limit, total }, query.since, rows),
    };
  }

  // ── Warehouses ────────────────────────────────────────────────────────────

  /**
   * A foreign key arriving in a request body is attacker-controlled: without
   * this check a tenant could attach a warehouse to a kiln it does not own, or
   * an item to another company's HSN rate. `company_id` itself always comes
   * from the JWT (ADR-013), but the ids it points at must be checked too.
   */
  private async assertBelongsToCompany(
    entity: typeof Site | typeof HsnRate,
    id: string,
    companyId: string,
    label: string,
  ): Promise<void> {
    const found = await this.dataSource.getRepository(entity).findOne({ where: { id, companyId } });
    if (!found) throw new NotFoundException(`${label} not found`);
  }

  async createWarehouse(companyId: string, userId: string, dto: CreateWarehouseDto): Promise<Warehouse> {
    await this.assertBelongsToCompany(Site, dto.siteId, companyId, 'Kiln');

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Warehouse);
      const wh = await repo.save(repo.create({ companyId, ...dto, createdBy: userId, updatedBy: userId }));
      await this.audit.record(
        { companyId, userId, entityName: 'warehouses', entityId: wh.id, action: 'CREATE', after: this.diffable(wh) },
        manager,
      );
      return wh;
    });
  }

  async updateWarehouse(companyId: string, userId: string, id: string, dto: UpdateWarehouseDto): Promise<Warehouse> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Warehouse);
      const wh = await repo.findOne({ where: { id, companyId } });
      if (!wh) throw new NotFoundException('Warehouse not found');

      const oldValues = { ...wh };
      Object.assign(wh, dto, { updatedBy: userId });
      const updated = await repo.save(wh);

      await this.audit.record(
        {
          companyId,
          userId,
          entityName: 'warehouses',
          entityId: wh.id,
          action: 'UPDATE',
          before: this.diffable(oldValues),
          after: this.diffable(updated),
        },
        manager,
      );
      return updated;
    });
  }

  async listWarehouses(
    companyId: string,
    query: InventoryMasterQueryDto,
  ): Promise<Paginated<WithTombstone<Warehouse>>> {
    const qb = this.warehouseRepo.createQueryBuilder('w').where('w.companyId = :companyId', { companyId });
    if (query.search) qb.andWhere('w.name ILIKE :search', { search: `%${query.search}%` });
    const delta = applySince(qb, 'w', query.since);
    // `isActive` is a filter for a human browsing the list. On a delta it would
    // hide the deactivation itself, which is this product's only retirement
    // signal — there are no DELETE endpoints (ADR-034).
    if (!delta && query.isActive !== undefined) {
      qb.andWhere('w.isActive = :isActive', { isActive: query.isActive });
    }
    if (!delta) qb.orderBy('w.createdAt', query.sort?.startsWith('-') ? 'DESC' : 'ASC');

    const [rows, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return {
      items: rows.map(withTombstone),
      meta: deltaMeta({ page: query.page, limit: query.limit, total }, query.since, rows),
    };
  }

  // ── Items ─────────────────────────────────────────────────────────────────

  async createItem(companyId: string, userId: string, dto: CreateItemDto): Promise<Item> {
    const unit = await this.unitRepo.findOne({ where: { id: dto.unitId, companyId } });
    if (!unit) throw new NotFoundException('Unit not found');
    if (dto.hsnId) await this.assertBelongsToCompany(HsnRate, dto.hsnId, companyId, 'HSN rate');

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Item);
      const item = await repo.save(repo.create({ companyId, ...dto, createdBy: userId, updatedBy: userId }));
      await this.audit.record(
        { companyId, userId, entityName: 'items', entityId: item.id, action: 'CREATE', after: this.diffable(item) },
        manager,
      );
      return item;
    });
  }

  async updateItem(companyId: string, userId: string, id: string, dto: UpdateItemDto): Promise<Item> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Item);
      const item = await repo.findOne({ where: { id, companyId } });
      if (!item) throw new NotFoundException('Item not found');

      if (dto.unitId && dto.unitId !== item.unitId) {
        const unit = await this.unitRepo.findOne({ where: { id: dto.unitId, companyId } });
        if (!unit) throw new NotFoundException('Unit not found');
      }
      if (dto.hsnId && dto.hsnId !== item.hsnId) {
        await this.assertBelongsToCompany(HsnRate, dto.hsnId, companyId, 'HSN rate');
      }

      const oldValues = { ...item };
      Object.assign(item, dto, { updatedBy: userId });
      const updated = await repo.save(item);

      await this.audit.record(
        {
          companyId,
          userId,
          entityName: 'items',
          entityId: item.id,
          action: 'UPDATE',
          before: this.diffable(oldValues),
          after: this.diffable(updated),
        },
        manager,
      );
      return updated;
    });
  }

  async listItems(companyId: string, query: InventoryMasterQueryDto): Promise<Paginated<WithTombstone<Item>>> {
    const qb = this.itemRepo.createQueryBuilder('i').where('i.companyId = :companyId', { companyId });
    if (query.search) qb.andWhere('i.name ILIKE :search', { search: `%${query.search}%` });
    const delta = applySince(qb, 'i', query.since);
    // `isActive` is a filter for a human browsing the list. On a delta it would
    // hide the deactivation itself, which is this product's only retirement
    // signal — there are no DELETE endpoints (ADR-034).
    if (!delta && query.isActive !== undefined) {
      qb.andWhere('i.isActive = :isActive', { isActive: query.isActive });
    }
    if (!delta) qb.orderBy('i.createdAt', query.sort?.startsWith('-') ? 'DESC' : 'ASC');

    const [rows, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return {
      items: rows.map(withTombstone),
      meta: deltaMeta({ page: query.page, limit: query.limit, total }, query.since, rows),
    };
  }

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
}
