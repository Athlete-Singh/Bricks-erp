import { Column, Entity } from 'typeorm';
import type { PurchaseOrderStatus } from '@brics/shared';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

/** PUR-01 — an intent to buy. Moves no stock and posts no journal. */
@Entity('purchase_orders')
export class PurchaseOrder extends TenantBaseEntity {
  @Column({ name: 'order_no', type: 'varchar', length: 30 })
  orderNo: string;

  @Column({ name: 'supplier_party_id', type: 'uuid' })
  supplierPartyId: string;

  @Column({ name: 'site_id', type: 'uuid' })
  siteId: string;

  @Column({ name: 'order_date', type: 'date' })
  orderDate: string;

  @Column({ name: 'expected_date', type: 'date', nullable: true })
  expectedDate: string | null;

  @Column({ type: 'varchar', length: 20, default: 'open' })
  status: PurchaseOrderStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
