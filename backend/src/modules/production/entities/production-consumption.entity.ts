import { Column, Entity } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

/**
 * PRD-04 — one row per (stage entry, item, source warehouse) consumed. Each
 * row points at the `stock_movements` row written in the same transaction, so
 * a yard shortfall can be walked back to the chamber that drew it down and
 * LEK-02 can read fuel against fired bricks without guessing which movement
 * belongs to which batch.
 */
@Entity('production_consumptions')
export class ProductionConsumption extends TenantBaseEntity {
  @Column({ name: 'entry_id', type: 'uuid' })
  entryId: string;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @Column({ type: 'numeric', precision: 18, scale: 3 })
  quantity: string;

  @Column({ name: 'stock_movement_id', type: 'uuid' })
  stockMovementId: string;
}
