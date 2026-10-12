import { Column, Entity } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

/**
 * PUR-03 / GST-03 — the supplier's invoice, and where value enters the books.
 *
 * `paidAmount` is maintained as payments allocate against it, so payables
 * ageing reads one column instead of summing the whole payment history per
 * bill on every request.
 */
@Entity('purchase_bills')
export class PurchaseBill extends TenantBaseEntity {
  @Column({ name: 'supplier_party_id', type: 'uuid' })
  supplierPartyId: string;

  @Column({ name: 'site_id', type: 'uuid' })
  siteId: string;

  @Column({ name: 'supplier_invoice_no', type: 'varchar', length: 50 })
  supplierInvoiceNo: string;

  @Column({ name: 'bill_date', type: 'date' })
  billDate: string;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ name: 'grn_id', type: 'uuid', nullable: true })
  grnId: string | null;

  // NUMERIC(18,2) carried as strings — never a float (CONVENTIONS).
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

  @Column({ name: 'voucher_id', type: 'uuid' })
  voucherId: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
