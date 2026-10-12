import { Column, Entity } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

@Entity('purchase_return_lines')
export class PurchaseReturnLine extends TenantBaseEntity {
  @Column({ name: 'purchase_return_id', type: 'uuid' })
  purchaseReturnId: string;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @Column({ type: 'numeric', precision: 18, scale: 3 })
  quantity: string;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  rate: string;

  @Column({ name: 'taxable_amount', type: 'numeric', precision: 18, scale: 2 })
  taxableAmount: string;

  @Column({ name: 'tax_amount', type: 'numeric', precision: 18, scale: 2, default: 0 })
  taxAmount: string;

  /** The stock OUT this line wrote. */
  @Column({ name: 'stock_movement_id', type: 'uuid' })
  stockMovementId: string;
}
