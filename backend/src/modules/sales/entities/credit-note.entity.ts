import { Column, Entity } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

/** SAL-06 — credits the customer. Dr Sales Returns + Output GST, Cr Customer. */
@Entity('credit_notes')
export class CreditNote extends TenantBaseEntity {
  @Column({ name: 'note_no', type: 'varchar', length: 30 })
  noteNo: string;

  @Column({ name: 'customer_party_id', type: 'uuid' })
  customerPartyId: string;

  @Column({ name: 'site_id', type: 'uuid' })
  siteId: string;

  @Column({ name: 'invoice_id', type: 'uuid', nullable: true })
  invoiceId: string | null;

  @Column({ name: 'note_date', type: 'date' })
  noteDate: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'taxable_amount', type: 'numeric', precision: 18, scale: 2 })
  taxableAmount: string;

  @Column({ name: 'tax_amount', type: 'numeric', precision: 18, scale: 2, default: 0 })
  taxAmount: string;

  @Column({ name: 'total_amount', type: 'numeric', precision: 18, scale: 2 })
  totalAmount: string;

  /** True if any line brought bricks back and StockService wrote an IN. */
  @Column({ name: 'restocked', type: 'boolean', default: false })
  restocked: boolean;

  @Column({ name: 'voucher_id', type: 'uuid' })
  voucherId: string;
}
