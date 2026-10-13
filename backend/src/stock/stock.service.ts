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

/**
 * What identifies a stock balance: one subject, in one place.
 *
 * The subject is always the **item** (ADR-051). `brickTypeId` names the grade
 * the movement was about and may be given on its own — the item is then read
 * off the grade — but it never keys a balance of its own, because production
 * sorting into a grade and a sale out of the same pile have to be one number.
 */
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

  /**
   * The subject's balance right now, as a decimal string.
   *
   * Keyed on the item alone. A grade's movements carry the grade as well, but
   * summing by grade would hide every brick that left on an invoice — the
   * balance has to be the pile, not the paperwork that named it.
   */
  async balanceOf(manager: EntityManager, companyId: string, subject: StockSubject): Promise<string> {
    const itemId = subject.itemId ?? (await this.itemOfGrade(manager, companyId, subject.brickTypeId));

    const row = await manager
      .createQueryBuilder(StockMovement, 'm')
      .select('COALESCE(SUM(m.quantity_in), 0) - COALESCE(SUM(m.quantity_out), 0)', 'balance')
      .where('m.company_id = :companyId', { companyId })
      .andWhere('m.warehouse_id = :warehouseId', { warehouseId: subject.warehouseId })
      .andWhere('m.item_id = :itemId', { itemId })
      .getRawOne<{ balance: string }>();

    return toQuantity(row?.balance ?? 0);
  }

  /** The item a grade is stocked as, for callers that only name the grade. */
  private async itemOfGrade(
    manager: EntityManager,
    companyId: string,
    brickTypeId: string | null | undefined,
  ): Promise<string> {
    if (!brickTypeId) {
      throw new BusinessRuleException('STOCK_SUBJECT_INVALID', 'A movement is about one item or one brick grade');
    }
    const grade = await manager.findOne(BrickType, { where: { id: brickTypeId, companyId } });
    if (!grade) throw new BusinessRuleException('BRICK_TYPE_NOT_FOUND', 'That brick grade does not exist');
    return grade.itemId;
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
    const resolved: StockSubject = { warehouseId: input.warehouseId, itemId: subject.itemId };

    if (direction === 'out' && !input.allowNegative) {
      await this.lockSubject(manager, companyId, resolved);

      const balance = await this.balanceOf(manager, companyId, resolved);
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
      itemId: subject.itemId,
      brickTypeId: subject.brickTypeId,
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

    // Keyed on the item, which is what the balance is keyed on. Keying on the
    // grade instead would let a sale and a sorting entry for the same pile run
    // side by side and both pass a check against the same balance.
    const key = `stock:${companyId}:${subject.warehouseId}:${subject.itemId ?? ''}`;
    await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [key]);
  }

  /**
   * Confirms the item and grade belong to this company and resolves the one
   * subject the movement is about.
   *
   * A caller may name the item, the grade, or both. Naming both and having
   * them disagree is refused rather than resolved in someone's favour: one of
   * the two is a bug, and guessing which would move the wrong pile.
   */
  private async resolveSubject(
    manager: EntityManager,
    companyId: string,
    subject: StockSubject,
  ): Promise<{ itemId: string; brickTypeId: string | null; label: string }> {
    if (!subject.itemId && !subject.brickTypeId) {
      throw new BusinessRuleException('STOCK_SUBJECT_INVALID', 'A movement is about one item or one brick grade');
    }

    let grade: BrickType | null = null;
    if (subject.brickTypeId) {
      grade = await manager.findOne(BrickType, { where: { id: subject.brickTypeId, companyId } });
      if (!grade) throw new BusinessRuleException('BRICK_TYPE_NOT_FOUND', 'That brick grade does not exist');
      if (!grade.isActive) {
        throw new BusinessRuleException('BRICK_TYPE_INACTIVE', `${grade.grade} is no longer in use`);
      }
    }

    const itemId = subject.itemId ?? grade!.itemId;
    if (grade && subject.itemId && grade.itemId !== subject.itemId) {
      throw new BusinessRuleException('STOCK_SUBJECT_MISMATCH', `${grade.grade} is not stocked as that item`);
    }

    const item = await manager.findOne(Item, { where: { id: itemId, companyId } });
    if (!item) throw new BusinessRuleException('ITEM_NOT_FOUND', 'That item does not exist');
    if (!item.isActive) throw new BusinessRuleException('ITEM_INACTIVE', `${item.name} is no longer in use`);

    return { itemId, brickTypeId: grade?.id ?? null, label: grade ? grade.grade : item.name };
  }
}
