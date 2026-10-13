import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { Repository } from 'typeorm';
import type { CurrentStockQueryDto, StockMovementQueryDto, StockMovementType } from '@brics/shared';
import type { Paginated } from '../common/interceptors/response-envelope.interceptor';
import { toCalendarDate, todayCalendarDate } from '../common/time/calendar-date';
import { StockMovement } from './entities/stock-movement.entity';

function toQuantity(value: Decimal.Value): string {
  return new Decimal(value).toFixed(3);
}

/**
 * One line of the current-stock report.
 *
 * The columns spell out INV-07's identity rather than just its answer:
 * `opening + produced + purchased + adjustedIn − sold − wasted − adjustedOut
 * = closing`. An owner who distrusts the closing figure can see which kind of
 * movement produced it, which is the point of a leakage report.
 */
export interface CurrentStockRow {
  siteId: string;
  siteName: string;
  warehouseId: string;
  warehouseName: string;
  subjectType: 'item' | 'brick';
  subjectId: string;
  subjectName: string;
  /** The unit an item is measured in; bricks are counted, so null. */
  unit: string | null;
  opening: string;
  purchased: string;
  produced: string;
  adjustedIn: string;
  transferredIn: string;
  sold: string;
  wasted: string;
  adjustedOut: string;
  transferredOut: string;
  closing: string;
}

export interface CurrentStock {
  asOf: string;
  from: string | null;
  rows: CurrentStockRow[];
  totals: { totalIn: string; totalOut: string };
}

export interface StockRegisterRow {
  id: string;
  movementDate: string;
  movementType: StockMovementType;
  warehouseId: string;
  warehouseName: string;
  subjectType: 'item' | 'brick';
  subjectId: string;
  subjectName: string;
  quantityIn: string;
  quantityOut: string;
  /** Only meaningful when the register is narrowed to one subject in one place. */
  runningBalance: string | null;
  sourceType: string | null;
  sourceId: string | null;
  notes: string | null;
}

/** The raw shape the register query returns. */
interface RegisterRaw {
  id: string;
  movementDate: string | Date;
  movementType: StockMovementType;
  warehouseId: string;
  warehouseName: string;
  itemId: string;
  itemName: string | null;
  brickTypeId: string | null;
  brickGrade: string | null;
  quantityIn: string;
  quantityOut: string;
  sourceType: string | null;
  sourceId: string | null;
  notes: string | null;
  createdAt: Date;
}

/** The raw shape the grouped query returns; every numeric arrives as a string. */
interface CurrentStockRaw {
  siteId: string;
  siteName: string;
  warehouseId: string;
  warehouseName: string;
  itemId: string;
  itemName: string | null;
  unitName: string | null;
  brickTypeId: string | null;
  brickGrade: string | null;
  movementType: StockMovementType;
  totalIn: string;
  totalOut: string;
  isBefore: boolean;
}

/** INV-07 — reading the stock ledger `StockService` writes. */
@Injectable()
export class StockReportsService {
  constructor(@InjectRepository(StockMovement) private readonly movements: Repository<StockMovement>) {}

  /**
   * Current stock, optionally as at a past date and from a start date.
   *
   * Everything before `from` collapses into `opening`, so the period columns
   * only describe the window asked for — the same convention the Trial Balance
   * already uses, so the two reports read alike.
   */
  async currentStock(companyId: string, query: CurrentStockQueryDto): Promise<CurrentStock> {
    const asOf = query.asOf ?? todayCalendarDate();
    const from = query.from ?? null;

    const qb = this.movements
      .createQueryBuilder('m')
      .innerJoin('sites', 's', 's.id = m.site_id')
      .innerJoin('warehouses', 'w', 'w.id = m.warehouse_id')
      .leftJoin('items', 'i', 'i.id = m.item_id')
      .leftJoin('units', 'u', 'u.id = i.unit_id')
      // Joined on the item, not on the movement's own grade column: a sale
      // names the item only, and joining its own column would split one pile
      // into a "graded" half and an "ungraded" half (ADR-051).
      .leftJoin('brick_types', 'b', 'b.item_id = m.item_id AND b.deleted_at IS NULL')
      .select('m.site_id', 'siteId')
      .addSelect('s.name', 'siteName')
      .addSelect('m.warehouse_id', 'warehouseId')
      .addSelect('w.name', 'warehouseName')
      .addSelect('m.item_id', 'itemId')
      .addSelect('i.name', 'itemName')
      .addSelect('u.abbreviation', 'unitName')
      .addSelect('b.id', 'brickTypeId')
      .addSelect('b.grade', 'brickGrade')
      .addSelect('m.movement_type', 'movementType')
      .addSelect('SUM(m.quantity_in)', 'totalIn')
      .addSelect('SUM(m.quantity_out)', 'totalOut')
      // One pass over the ledger: each group is tagged as before the window or
      // inside it, rather than running the same query twice.
      .addSelect(from ? 'm.movement_date < :from' : 'FALSE', 'isBefore')
      .where('m.company_id = :companyId', { companyId })
      .andWhere('m.movement_date <= :asOf', { asOf })
      .groupBy('m.site_id')
      .addGroupBy('s.name')
      .addGroupBy('m.warehouse_id')
      .addGroupBy('w.name')
      .addGroupBy('m.item_id')
      .addGroupBy('i.name')
      .addGroupBy('u.abbreviation')
      .addGroupBy('b.id')
      .addGroupBy('b.grade')
      .addGroupBy('m.movement_type');

    if (from) {
      qb.setParameter('from', from);
      qb.addGroupBy('m.movement_date < :from');
    }
    if (query.siteId) qb.andWhere('m.site_id = :siteId', { siteId: query.siteId });
    if (query.warehouseId) qb.andWhere('m.warehouse_id = :warehouseId', { warehouseId: query.warehouseId });
    // "Brick" means the item is a grade's item; "item" means it is not.
    if (query.subject === 'item') qb.andWhere('b.id IS NULL');
    if (query.subject === 'brick') qb.andWhere('b.id IS NOT NULL');

    const raw = await qb.getRawMany<CurrentStockRaw>();
    return this.foldIntoRows(raw, asOf, from, query.includeZero);
  }

  /** Collapses the grouped rows into one line per subject per warehouse. */
  private foldIntoRows(raw: CurrentStockRaw[], asOf: string, from: string | null, includeZero: boolean): CurrentStock {
    const byKey = new Map<string, CurrentStockRow>();

    for (const r of raw) {
      const subjectType: 'item' | 'brick' = r.brickTypeId ? 'brick' : 'item';
      const subjectId = r.itemId;
      const key = `${r.warehouseId}:${subjectId}`;

      const row =
        byKey.get(key) ??
        ({
          siteId: r.siteId,
          siteName: r.siteName,
          warehouseId: r.warehouseId,
          warehouseName: r.warehouseName,
          subjectType,
          subjectId,
          subjectName: r.brickGrade ?? r.itemName ?? 'Unknown',
          unit: r.unitName,
          opening: '0.000',
          purchased: '0.000',
          produced: '0.000',
          adjustedIn: '0.000',
          transferredIn: '0.000',
          sold: '0.000',
          wasted: '0.000',
          adjustedOut: '0.000',
          transferredOut: '0.000',
          closing: '0.000',
        } satisfies CurrentStockRow);

      const inQty = new Decimal(r.totalIn ?? 0);
      const outQty = new Decimal(r.totalOut ?? 0);

      // Anything before the window, and the opening row itself, is opening stock.
      if (r.isBefore || r.movementType === 'opening') {
        row.opening = toQuantity(new Decimal(row.opening).plus(inQty).minus(outQty));
      } else {
        const bucket = this.bucketFor(r.movementType, inQty.greaterThan(0));
        if (bucket) row[bucket] = toQuantity(new Decimal(row[bucket]).plus(inQty.gt(0) ? inQty : outQty));
      }

      byKey.set(key, row);
    }

    let totalIn = new Decimal(0);
    let totalOut = new Decimal(0);

    for (const row of byKey.values()) {
      const added = new Decimal(row.purchased).plus(row.produced).plus(row.adjustedIn).plus(row.transferredIn);
      const removed = new Decimal(row.sold).plus(row.wasted).plus(row.adjustedOut).plus(row.transferredOut);

      row.closing = toQuantity(new Decimal(row.opening).plus(added).minus(removed));
      totalIn = totalIn.plus(added);
      totalOut = totalOut.plus(removed);
    }

    const rows = [...byKey.values()]
      .filter((r) => includeZero || r.closing !== '0.000' || r.opening !== '0.000')
      .sort(
        (a, b) =>
          a.siteName.localeCompare(b.siteName) ||
          a.warehouseName.localeCompare(b.warehouseName) ||
          a.subjectType.localeCompare(b.subjectType) ||
          a.subjectName.localeCompare(b.subjectName),
      );

    return { asOf, from, rows, totals: { totalIn: toQuantity(totalIn), totalOut: toQuantity(totalOut) } };
  }

  /** Which column a movement type lands in. `opening` is handled before this. */
  private bucketFor(
    type: StockMovementType,
    isIn: boolean,
  ):
    | keyof Pick<
        CurrentStockRow,
        'purchased' | 'produced' | 'adjustedIn' | 'transferredIn' | 'sold' | 'wasted' | 'adjustedOut' | 'transferredOut'
      >
    | null {
    switch (type) {
      case 'purchase':
        return 'purchased';
      case 'production':
        return isIn ? 'produced' : 'wasted';
      case 'sale':
        return 'sold';
      case 'wastage':
        return 'wasted';
      case 'adjustment':
        return isIn ? 'adjustedIn' : 'adjustedOut';
      case 'transfer':
        return isIn ? 'transferredIn' : 'transferredOut';
      default:
        return null;
    }
  }

  /**
   * The movement register (INV-07): every line, newest first.
   *
   * A running balance is only shown when the filters narrow to a single subject
   * in a single warehouse — a running total across different items in different
   * yards would be a number that means nothing.
   */
  async register(companyId: string, query: StockMovementQueryDto): Promise<Paginated<StockRegisterRow>> {
    const qb = this.movements
      .createQueryBuilder('m')
      .innerJoin('warehouses', 'w', 'w.id = m.warehouse_id')
      .leftJoin('items', 'i', 'i.id = m.item_id')
      .leftJoin('brick_types', 'b', 'b.item_id = m.item_id AND b.deleted_at IS NULL')
      .select('m.id', 'id')
      .addSelect('m.movement_date', 'movementDate')
      .addSelect('m.movement_type', 'movementType')
      .addSelect('m.warehouse_id', 'warehouseId')
      .addSelect('w.name', 'warehouseName')
      .addSelect('m.item_id', 'itemId')
      .addSelect('i.name', 'itemName')
      .addSelect('b.id', 'brickTypeId')
      .addSelect('b.grade', 'brickGrade')
      .addSelect('m.quantity_in', 'quantityIn')
      .addSelect('m.quantity_out', 'quantityOut')
      .addSelect('m.source_type', 'sourceType')
      .addSelect('m.source_id', 'sourceId')
      .addSelect('m.notes', 'notes')
      // Needed to carry the balance across pages: same-date rows are ordered by
      // created_at, so the tie has to be broken the same way the page order
      // does. Without it the carried balance silently dropped every row sharing
      // the oldest row's date.
      .addSelect('m.created_at', 'createdAt')
      .where('m.company_id = :companyId', { companyId });

    if (query.warehouseId) qb.andWhere('m.warehouse_id = :warehouseId', { warehouseId: query.warehouseId });
    if (query.itemId) qb.andWhere('m.item_id = :itemId', { itemId: query.itemId });
    // Asking for a grade means asking for its pile — including the rows that
    // took bricks out on an invoice, which name the item and not the grade.
    if (query.brickTypeId) qb.andWhere('b.id = :brickTypeId', { brickTypeId: query.brickTypeId });
    if (query.movementType) qb.andWhere('m.movement_type = :movementType', { movementType: query.movementType });
    if (query.from) qb.andWhere('m.movement_date >= :from', { from: query.from });
    if (query.to) qb.andWhere('m.movement_date <= :to', { to: query.to });

    const total = await qb.getCount();

    const raw = await qb
      .orderBy('m.movement_date', 'DESC')
      .addOrderBy('m.created_at', 'DESC')
      .offset((query.page - 1) * query.limit)
      .limit(query.limit)
      .getRawMany<RegisterRaw>();

    const narrowed = Boolean(query.warehouseId && (query.itemId || query.brickTypeId));
    const rows = await this.withRunningBalance(companyId, query, raw, narrowed);

    return { items: rows, meta: { page: query.page, limit: query.limit, total } };
  }

  /**
   * Adds the running balance when the register is narrowed to one subject.
   *
   * The page is newest-first, so the balance is built from the balance *before*
   * the oldest row on the page and then walked forward, which keeps it correct
   * on page 2 instead of restarting from zero.
   */
  private async withRunningBalance(
    companyId: string,
    query: StockMovementQueryDto,
    raw: RegisterRaw[],
    narrowed: boolean,
  ): Promise<StockRegisterRow[]> {
    const toRow = (r: RegisterRaw, runningBalance: string | null): StockRegisterRow => ({
      id: r.id,
      movementDate: toCalendarDate(r.movementDate),
      movementType: r.movementType,
      warehouseId: r.warehouseId,
      warehouseName: r.warehouseName,
      subjectType: r.brickTypeId ? 'brick' : 'item',
      subjectId: r.itemId,
      subjectName: r.brickGrade ?? r.itemName ?? 'Unknown',
      quantityIn: toQuantity(r.quantityIn ?? 0),
      quantityOut: toQuantity(r.quantityOut ?? 0),
      runningBalance,
      sourceType: r.sourceType ?? null,
      sourceId: r.sourceId ?? null,
      notes: r.notes ?? null,
    });

    if (!narrowed || raw.length === 0) {
      return raw.map((r) => toRow(r, null));
    }

    const oldestOnPage = raw[raw.length - 1]!;
    const before = this.movements
      .createQueryBuilder('m')
      .select('COALESCE(SUM(m.quantity_in), 0) - COALESCE(SUM(m.quantity_out), 0)', 'balance')
      .where('m.company_id = :companyId', { companyId })
      .andWhere('m.warehouse_id = :warehouseId', { warehouseId: query.warehouseId })
      .andWhere('(m.movement_date < :date OR (m.movement_date = :date AND m.created_at < :createdAt))', {
        date: oldestOnPage.movementDate,
        createdAt: oldestOnPage.createdAt,
      });

    // One subject, one balance: the item. A grade filter resolves to its item
    // so the carried balance matches the rows on the page.
    if (query.itemId) {
      before.andWhere('m.item_id = :itemId', { itemId: query.itemId });
    } else {
      before.andWhere('m.item_id = (SELECT b2.item_id FROM brick_types b2 WHERE b2.id = :brickTypeId)', {
        brickTypeId: query.brickTypeId,
      });
    }

    const opening = await before.getRawOne<{ balance: string }>();
    let balance = new Decimal(opening?.balance ?? 0);

    // Walk oldest to newest so the arithmetic is forward, then restore the
    // newest-first order the caller asked for.
    const ascending = [...raw].reverse();
    const withBalance = ascending.map((r) => {
      balance = balance.plus(r.quantityIn ?? 0).minus(r.quantityOut ?? 0);
      return toRow(r, toQuantity(balance));
    });

    return withBalance.reverse();
  }
}
