import { Column, Entity } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

/**
 * PUR-05 — goods going back, as a debit note.
 *
 * Moves stock out and reverses the supplier's credit and the input GST in one
 * transaction, so the books and the yard cannot disagree about a return.
 */
@Entity('purchase_returns')
export class PurchaseReturn extends TenantBaseEntity {
  @Column({ name: 'supplier_party_id', type: 'uuid' })
  supplierPartyId: string;

  @Column({ name: 'site_id', type: 'uuid' })
  siteId: string;

  @Column({ name: 'bill_id', type: 'uuid', nullable: true })
  billId: string | null;

  @Column({ name: 'return_date', type: 'date' })
  returnDate: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'taxable_amount', type: 'numeric', precision: 18, scale: 2 })
  taxableAmount: string;

  @Column({ name: 'tax_amount', type: 'numeric', precision: 18, scale: 2, default: 0 })
  taxAmount: string;

  @Column({ name: 'total_amount', type: 'numeric', precision: 18, scale: 2 })
  totalAmount: string;

  @Column({ name: 'voucher_id', type: 'uuid' })
  voucherId: string;
}
