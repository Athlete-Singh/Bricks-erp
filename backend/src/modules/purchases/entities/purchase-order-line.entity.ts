import { Column, Entity } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

@Entity('purchase_order_lines')
export class PurchaseOrderLine extends TenantBaseEntity {
  @Column({ name: 'purchase_order_id', type: 'uuid' })
  purchaseOrderId: string;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  @Column({ type: 'numeric', precision: 18, scale: 3 })
  quantity: string;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  rate: string;

  /** Filled in as goods arrive, so a PO can be part-received. */
  @Column({ name: 'received_quantity', type: 'numeric', precision: 18, scale: 3, default: 0 })
  receivedQuantity: string;
}
