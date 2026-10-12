import { Column, Entity } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

/**
 * PUR-02 — goods through the gate.
 *
 * Quantity only: ACCOUNTING_RULES puts value on the bill, so a receipt writes
 * stock and nothing else. This is the P7 instance of INV-05.
 */
@Entity('goods_receipts')
export class GoodsReceipt extends TenantBaseEntity {
  @Column({ name: 'grn_no', type: 'varchar', length: 30 })
  grnNo: string;

  @Column({ name: 'supplier_party_id', type: 'uuid' })
  supplierPartyId: string;

  @Column({ name: 'site_id', type: 'uuid' })
  siteId: string;

  @Column({ name: 'purchase_order_id', type: 'uuid', nullable: true })
  purchaseOrderId: string | null;

  @Column({ name: 'receipt_date', type: 'date' })
  receiptDate: string;

  @Column({ name: 'challan_no', type: 'varchar', length: 50, nullable: true })
  challanNo: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
