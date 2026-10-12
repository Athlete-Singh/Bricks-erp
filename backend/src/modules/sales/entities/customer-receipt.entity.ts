import { Column, Entity } from 'typeorm';
import type { SalesPaymentMode } from '@brics/shared';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

/** SAL-05 — a receipt from a customer, allocated bill-wise. */
@Entity('customer_receipts')
export class CustomerReceipt extends TenantBaseEntity {
  @Column({ name: 'customer_party_id', type: 'uuid' })
  customerPartyId: string;

  @Column({ name: 'site_id', type: 'uuid' })
  siteId: string;

  @Column({ name: 'receipt_date', type: 'date' })
  receiptDate: string;

  @Column({ type: 'varchar', length: 10 })
  mode: SalesPaymentMode;

  @Column({ name: 'deposit_to_ledger_id', type: 'uuid' })
  depositToLedgerId: string;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  reference: string | null;

  @Column({ name: 'voucher_id', type: 'uuid' })
  voucherId: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
