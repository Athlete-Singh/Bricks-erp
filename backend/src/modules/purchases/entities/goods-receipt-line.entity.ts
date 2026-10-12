import { Column, Entity } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

@Entity('goods_receipt_lines')
export class GoodsReceiptLine extends TenantBaseEntity {
  @Column({ name: 'goods_receipt_id', type: 'uuid' })
  goodsReceiptId: string;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @Column({ type: 'numeric', precision: 18, scale: 3 })
  quantity: string;

  /** The exact stock row this line wrote, so a balance walks back to its receipt. */
  @Column({ name: 'stock_movement_id', type: 'uuid' })
  stockMovementId: string;
}
