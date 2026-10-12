import { Column, Entity, Index } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

/** One grade of brick, out of one yard, on one challan. */
@Entity('dispatch_lines')
export class DispatchLine extends TenantBaseEntity {
  @Column({ name: 'dispatch_id', type: 'uuid' })
  @Index()
  dispatchId: string;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @Column({ type: 'numeric', precision: 18, scale: 3 })
  quantity: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
