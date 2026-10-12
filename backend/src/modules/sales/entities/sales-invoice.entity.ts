import { Column, Entity } from 'typeorm';
import type { SalesInvoiceStatus } from '@brics/shared';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

/**
 * SAL-03 — the GST tax invoice. Value enters the ledger here, stock OUT fires
 * from StockService in the same transaction. The `invoiceNo` is user-visible
 * and matches the voucher number (OQ #16), so one gapless series carries both.
 *
 * `paidAmount` is maintained as receipts allocate against it, so receivables
 * ageing reads one column instead of summing the whole receipt history per
 * invoice on every request.
 */
@Entity('sales_invoices')
export class SalesInvoice extends TenantBaseEntity {
  @Column({ name: 'invoice_no', type: 'varchar', length: 30 })
  invoiceNo: string;

  @Column({ name: 'customer_party_id', type: 'uuid' })
  customerPartyId: string;

  @Column({ name: 'site_id', type: 'uuid' })
  siteId: string;

  @Column({ name: 'sales_order_id', type: 'uuid', nullable: true })
  salesOrderId: string | null;

  @Column({ name: 'invoice_date', type: 'date' })
  invoiceDate: string;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ name: 'customer_po_no', type: 'varchar', length: 50, nullable: true })
  customerPoNo: string | null;

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

  @Column({ name: 'paid_amount', type: 'numeric', precision: 18, scale: 2, default: 0 })
  paidAmount: string;

  @Column({ type: 'varchar', length: 20, default: 'open' })
  status: SalesInvoiceStatus;

  @Column({ name: 'voucher_id', type: 'uuid' })
  voucherId: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
