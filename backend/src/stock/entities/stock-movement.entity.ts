import { Column, Entity, Index } from 'typeorm';
import type { StockMovementType } from '@brics/shared';
import { TenantBaseEntity } from '../../common/entities/base.entity';

/**
 * One line of the stock ledger (INV-04).
 *
 * Shaped like `voucher_lines` on purpose: one-sided, non-negative, and written
 * only by `StockService`. A row says what moved, which direction, where, when,
 * and which document caused it — so a closing balance can always be walked back
 * to the entries that produced it.
 */
@Entity('stock_movements')
@Index('idx_stock_movements_company_date', ['companyId', 'movementDate'])
export class StockMovement extends TenantBaseEntity {
  @Column({ name: 'site_id', type: 'uuid' })
  siteId: string;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  /** Exactly one of `itemId` / `brickTypeId` is set — ADR-023. */
  /** The subject of the balance. Every movement has one, bricks included (ADR-051). */
  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  /** The grade, when the item is one. Descriptive — the balance is keyed on the item. */
  @Column({ name: 'brick_type_id', type: 'uuid', nullable: true })
  brickTypeId: string | null;

  @Column({ name: 'movement_type', type: 'varchar', length: 20 })
  movementType: StockMovementType;

  // NUMERIC(18,3) carried as strings — never a float (ADR-025).
  @Column({ name: 'quantity_in', type: 'numeric', precision: 18, scale: 3, default: 0 })
  quantityIn: string;

  @Column({ name: 'quantity_out', type: 'numeric', precision: 18, scale: 3, default: 0 })
  quantityOut: string;

  @Column({ name: 'movement_date', type: 'date' })
  movementDate: string;

  /** The document that caused this, e.g. `grn` + its id. Null for opening and adjustment. */
  @Column({ name: 'source_type', type: 'varchar', length: 30, nullable: true })
  sourceType: string | null;

  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  sourceId: string | null;

  /** Required for an adjustment (INV-06); free text otherwise. */
  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
