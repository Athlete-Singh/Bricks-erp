import { Column, Entity } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

@Entity('sales_order_lines')
export class SalesOrderLine extends TenantBaseEntity {
  @Column({ name: 'sales_order_id', type: 'uuid' })
  salesOrderId: string;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  @Column({ type: 'numeric', precision: 18, scale: 3 })
  quantity: string;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  rate: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  discount: string;

  @Column({ name: 'taxable_amount', type: 'numeric', precision: 18, scale: 2 })
  taxableAmount: string;

  @Column({ name: 'cgst_rate', type: 'numeric', precision: 5, scale: 2, default: 0 })
  cgstRate: string;

  @Column({ name: 'sgst_rate', type: 'numeric', precision: 5, scale: 2, default: 0 })
  sgstRate: string;

  @Column({ name: 'igst_rate', type: 'numeric', precision: 5, scale: 2, default: 0 })
  igstRate: string;

  @Column({ name: 'cgst_amount', type: 'numeric', precision: 18, scale: 2, default: 0 })
  cgstAmount: string;

  @Column({ name: 'sgst_amount', type: 'numeric', precision: 18, scale: 2, default: 0 })
  sgstAmount: string;

  @Column({ name: 'igst_amount', type: 'numeric', precision: 18, scale: 2, default: 0 })
  igstAmount: string;

  /** Filled in as invoices come out of this SO. */
  @Column({ name: 'invoiced_quantity', type: 'numeric', precision: 18, scale: 3, default: 0 })
  invoicedQuantity: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;
}
