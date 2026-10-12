import { Column, Entity } from 'typeorm';
import type { SalesOrderStatus } from '@brics/shared';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

/** SAL-02 — a confirmed order to supply, no stock or value moved yet. */
@Entity('sales_orders')
export class SalesOrder extends TenantBaseEntity {
  @Column({ name: 'order_no', type: 'varchar', length: 30 })
  orderNo: string;

  @Column({ name: 'customer_party_id', type: 'uuid' })
  customerPartyId: string;

  @Column({ name: 'site_id', type: 'uuid' })
  siteId: string;

  @Column({ name: 'quotation_id', type: 'uuid', nullable: true })
  quotationId: string | null;

  @Column({ name: 'order_date', type: 'date' })
  orderDate: string;

  @Column({ name: 'expected_date', type: 'date', nullable: true })
  expectedDate: string | null;

  @Column({ type: 'varchar', length: 20, default: 'open' })
  status: SalesOrderStatus;

  @Column({ name: 'taxable_amount', type: 'numeric', precision: 18, scale: 2 })
  taxableAmount: string;

  @Column({ name: 'cgst_amount', type: 'numeric', precision: 18, scale: 2, default: 0 })
  cgstAmount: string;

  @Column({ name: 'sgst_amount', type: 'numeric', precision: 18, scale: 2, default: 0 })
  sgstAmount: string;

  @Column({ name: 'igst_amount', type: 'numeric', precision: 18, scale: 2, default: 0 })
  igstAmount: string;

  @Column({ name: 'total_amount', type: 'numeric', precision: 18, scale: 2 })
  totalAmount: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
