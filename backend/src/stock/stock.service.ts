import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { EntityManager } from 'typeorm';
import type { OpeningStockDto, StockAdjustmentDto, StockMovementType } from '@brics/shared';
import { BusinessRuleException } from '../common/exceptions/business-rule.exception';
import { todayCalendarDate } from '../common/time/calendar-date';
import { AuditService } from '../modules/audit/audit.service';
import { Warehouse } from '../modules/inventory/entities/warehouse.entity';
import { Item } from '../modules/inventory/entities/item.entity';
import { BrickType } from '../modules/inventory/entities/brick-type.entity';
import { StockMovement } from './entities/stock-movement.entity';

Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

/** What identifies a stock balance: one subject, in one place. */
export interface StockSubject {
  warehouseId: string;
  itemId?: string | null;
  brickTypeId?: string | null;
}

export interface RecordMovementInput extends StockSubject {
  companyId: string;
  userId: string;
  movementType: StockMovementType;
  direction: 'in' | 'out';
  quantity: string;
  movementDate: string;
  sourceType?: string | null;
  sourceId?: string | null;
  notes?: string | null;
  /**
   * Only an adjustment sets this (ADR-026). It is not a parameter callers pass
   * casually — the adjustment path sets it, nothing else may.
   */
  allowNegative?: boolean;
}

/** Quantities are decimal strings everywhere, including out of this service. */
function toQuantity(value: Decimal.Value): string {
  return new Decimal(value).toFixed(3);
}

/**
 * The only thing that writes `stock_movements` (INV-04).
 *
 * Like `PostingService`, it takes the **caller's** `EntityManager`, so a
 * document and the stock it moves commit or roll back together — a GRN that
 * saved but left no movement, or a movement with no GRN, would both be
 * corruption that no later report could detect.
 */
@Injectable()
export class StockService {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly audit: AuditService,
  ) {}

  /** The subject's balance right now, outside any transaction of the caller's. */
  async currentBalance(companyId: string, subject: StockSubject): Promise<string> {
    return this.balanceOf(this.em, companyId, subject);
  }

  /** The subject's balance right now, as a decimal string. */
  async balanceOf(manager: EntityManager, companyId: string, subject: StockSubject): Promise<string> {
    const qb = manager
      .createQueryBuilder(StockMovement, 'm')
      .select('COALESCE(SUM(m.quantity_in), 0) - COALESCE(SUM(m.quantity_out), 0)', 'balance')
      .where('m.company_id = :companyId', { companyId })
      .andWhere('m.warehouse_id = :warehouseId', { warehouseId: subject.warehouseId });

    // `= NULL` is never true, so the unused side has to be matched with IS NULL.
    if (subject.itemId) qb.andWhere('m.item_id = :itemId', { itemId: subject.itemId });
    else qb.andWhere('m.item_id IS NULL');
    if (subject.brickTypeId) qb.andWhere('m.brick_type_id = :brickTypeId', { brickTypeId: subject.brickTypeId });
    else qb.andWhere('m.brick_type_id IS NULL');

    const row = await qb.getRawOne<{ balance: string }>();
    return toQuantity(row?.balance ?? 0);
  }

  /**
   * Writes one movement in the caller's transaction.
   *
   * Every id in the input is checked against the caller's company before use —
   * a warehouse, item or grade from another tenant is a 404, not a silent
   * cross-tenant write (ADR-021).
   */
  async record(manager: EntityManager, input: RecordMovementInput): Promise<StockMovement> {
    const { companyId, userId, direction, quantity } = input;

    const amount = new Decimal(quantity);
    if (amount.lessThanOrEqualTo(0)) {
      throw new BusinessRuleException('STOCK_QUANTITY_INVALID', 'A movement must be more than zero');
    }

    // Stock cannot move tomorrow. A mistyped year is the common data-entry
    // error here, and it would silently distort every `asOf` report rather than
    // failing anywhere visible.
    const today = todayCalendarDate();
    if (input.movementDate > today) {
      throw new BusinessRuleException('STOCK_DATE_IN_FUTURE', `A movement cannot be dated after today (${today})`);
    }

    const warehouse = await manager.findOne(Warehouse, {
      where: { id: input.warehouseId, companyId },
    });
    if (!warehouse) throw new BusinessRuleException('WAREHOUSE_NOT_FOUND', 'That warehouse does not exist');
    if (!warehouse.isActive) {
      throw new BusinessRuleException('WAREHOUSE_INACTIVE', `${warehouse.name} is no longer in use`);
    }

    const subject = await this.resolveSubject(manager, companyId, input);

    if (direction === 'out' && !input.allowNegative) {
      await this.lockSubject(manager, companyId, input);

      const balance = await this.balanceOf(manager, companyId, input);
      if (new Decimal(balance).lessThan(amount)) {
        // ADR-026 — refuse rather than let a balance drift below zero, which is
        // what leakage looks like in the data.
        throw new BusinessRuleException(
          'STOCK_INSUFFICIENT',
          `Only ${balance} of ${subject.label} is in ${warehouse.name}, and this takes out ${toQuantity(amount)}`,
        );
      }
    }

    const movement = manager.create(StockMovement, {
      companyId,
      createdBy: userId,
      updatedBy: userId,
      siteId: warehouse.siteId,
      warehouseId: warehouse.id,
      itemId: input.itemId ?? null,
      brickTypeId: input.brickTypeId ?? null,
      movementType: input.movementType,
      quantityIn: direction === 'in' ? toQuantity(amount) : '0.000',
      quantityOut: direction === 'out' ? toQuantity(amount) : '0.000',
      movementDate: input.movementDate,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      notes: input.notes ?? null,
    });

    await manager.save(movement);

    await this.audit.record(
      {
        companyId,
        userId,
        action: 'CREATE',
        entityName: 'stock_movements',
        entityId: movement.id,
        after: {
          movementType: movement.movementType,
          subject: subject.label,
          warehouse: warehouse.name,
          quantityIn: movement.quantityIn,
          quantityOut: movement.quantityOut,
          movementDate: movement.movementDate,
          notes: movement.notes,
        },
      },
      manager,
    );

    return movement;
  }

  /** INV-03 — the balance a kiln starts with. One per subject per warehouse. */
  async openingStock(companyId: string, userId: string, dto: OpeningStockDto): Promise<StockMovement> {
    return this.em.transaction((manager) =>
      this.record(manager, {
        companyId,
        userId,
        warehouseId: dto.warehouseId,
        itemId: dto.itemId,
        brickTypeId: dto.brickTypeId,
        movementType: 'opening',
        direction: 'in',
        quantity: dto.quantity,
        movementDate: dto.movementDate,
        notes: dto.notes ?? null,
      }),
    );
  }

  /**
   * INV-06 — a counted correction. This is the one path that may take a balance
   * negative, because refusing it would leave the books disagreeing with the
   * yard, and a wrong number nobody can fix is worse than a negative one
   * somebody has signed their name to.
   */
  async adjust(companyId: string, userId: string, dto: StockAdjustmentDto): Promise<StockMovement> {
    return this.em.transaction((manager) =>
      this.record(manager, {
        companyId,
        userId,
        warehouseId: dto.warehouseId,
        itemId: dto.itemId,
        brickTypeId: dto.brickTypeId,
        movementType: 'adjustment',
        direction: dto.direction,
        quantity: dto.quantity,
        movementDate: dto.movementDate,
        notes: dto.reason,
        allowNegative: true,
      }),
    );
  }

  /**
   * Serialises the check-then-write for one subject in one warehouse.
   *
   * Reading a balance and then inserting against it is a read-then-write race:
   * without this, eight concurrent issues of 20 all passed a check against a
   * balance of 100 and took it to −60, which is precisely the hole ADR-026
   * exists to close. Offline mobile sync (M14) makes concurrent writes the
   * normal case, not an exotic one.
   *
   * An advisory lock rather than `SELECT … FOR UPDATE`: the rows that matter
   * are the ones *about to be inserted*, which no row lock can cover. It is
   * held to the end of the transaction and keyed per subject, so unrelated
   * stock never queues behind it. A hash collision would only make two
   * unrelated subjects take turns — slower, never wrong.
   *
   * Only the `out` path takes it. An `in` committing alongside can only make
   * more stock available, so the worst it can cause is a refusal that would
   * have succeeded a moment later — never an over-issue.
   */
  private async lockSubject(manager: EntityManager, companyId: string, subject: StockSubject): Promise<void> {
    if (!manager.queryRunner?.isTransactionActive) {
      // Outside a transaction the lock would be released immediately and the
      // guarantee would be silently absent — fail loudly instead.
      throw new BusinessRuleException('STOCK_REQUIRES_TRANSACTION', 'Stock must be recorded inside a transaction');
    }

    const key = `stock:${companyId}:${subject.warehouseId}:${subject.itemId ?? subject.brickTypeId ?? ''}`;
    await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [key]);
  }

  /** Confirms the item or grade belongs to this company, and names it for messages. */
  private async resolveSubject(
    manager: EntityManager,
    companyId: string,
    subject: StockSubject,
  ): Promise<{ label: string }> {
    if (Boolean(subject.itemId) === Boolean(subject.brickTypeId)) {
      throw new BusinessRuleException('STOCK_SUBJECT_INVALID', 'A movement is about one item or one brick grade');
    }

    if (subject.itemId) {
      const item = await manager.findOne(Item, { where: { id: subject.itemId, companyId } });
      if (!item) throw new BusinessRuleException('ITEM_NOT_FOUND', 'That item does not exist');
      if (!item.isActive) throw new BusinessRuleException('ITEM_INACTIVE', `${item.name} is no longer in use`);
      return { label: item.name };
    }

    const grade = await manager.findOne(BrickType, { where: { id: subject.brickTypeId!, companyId } });
    if (!grade) throw new BusinessRuleException('BRICK_TYPE_NOT_FOUND', 'That brick grade does not exist');
    if (!grade.isActive) throw new BusinessRuleException('BRICK_TYPE_INACTIVE', `${grade.grade} is no longer in use`);
    return { label: grade.grade };
  }
}
