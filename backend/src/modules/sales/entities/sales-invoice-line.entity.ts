import { Column, Entity } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

@Entity('sales_invoice_lines')
export class SalesInvoiceLine extends TenantBaseEntity {
  @Column({ name: 'sales_invoice_id', type: 'uuid' })
  salesInvoiceId: string;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

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

  /** HSN snapshot — kept on the line so a later HSN edit cannot drift the invoice. */
  @Column({ name: 'hsn_code', type: 'varchar', length: 16, nullable: true })
  hsnCode: string | null;

  @Column({ name: 'stock_movement_id', type: 'uuid' })
  stockMovementId: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;
}
