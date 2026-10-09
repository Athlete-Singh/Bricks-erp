import { Column, Entity } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

/**
 * PRD-05 — one row per good brick grade a sorting entry produced, and its
 * matching `stock_movements` row, so a closing balance can be walked back to
 * the chamber that produced it.
 */
@Entity('production_sorting_outputs')
export class ProductionSortingOutput extends TenantBaseEntity {
  @Column({ name: 'entry_id', type: 'uuid' })
  entryId: string;

  @Column({ name: 'brick_type_id', type: 'uuid' })
  brickTypeId: string;

  @Column({ type: 'numeric', precision: 18, scale: 3 })
  quantity: string;

  @Column({ name: 'stock_movement_id', type: 'uuid' })
  stockMovementId: string;
}
