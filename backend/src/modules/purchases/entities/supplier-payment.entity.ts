import { Column, Entity } from 'typeorm';
import type { PurchasePaymentMode } from '@brics/shared';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

/** PUR-04 — money out, always allocated to the bills it settles. */
@Entity('supplier_payments')
export class SupplierPayment extends TenantBaseEntity {
  @Column({ name: 'supplier_party_id', type: 'uuid' })
  supplierPartyId: string;

  @Column({ name: 'site_id', type: 'uuid' })
  siteId: string;

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate: string;

  @Column({ type: 'varchar', length: 10 })
  mode: PurchasePaymentMode;

  @Column({ name: 'paid_from_ledger_id', type: 'uuid' })
  paidFromLedgerId: string;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  reference: string | null;

  @Column({ name: 'voucher_id', type: 'uuid' })
  voucherId: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
