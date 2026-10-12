import { Column, Entity } from 'typeorm';
import type { QuotationStatus } from '@brics/shared';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

/** SAL-01 — an offer to sell. Moves no stock and posts no journal. */
@Entity('quotations')
export class Quotation extends TenantBaseEntity {
  @Column({ name: 'quote_no', type: 'varchar', length: 30 })
  quoteNo: string;

  @Column({ name: 'customer_party_id', type: 'uuid' })
  customerPartyId: string;

  @Column({ name: 'site_id', type: 'uuid' })
  siteId: string;

  @Column({ name: 'quote_date', type: 'date' })
  quoteDate: string;

  @Column({ name: 'valid_until', type: 'date', nullable: true })
  validUntil: string | null;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: QuotationStatus;

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
