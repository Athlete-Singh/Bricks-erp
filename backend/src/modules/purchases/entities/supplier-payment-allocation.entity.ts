import { Column, Entity } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

/** Which bill a payment settled, and by how much — the basis of ageing. */
@Entity('supplier_payment_allocations')
export class SupplierPaymentAllocation extends TenantBaseEntity {
  @Column({ name: 'supplier_payment_id', type: 'uuid' })
  supplierPaymentId: string;

  @Column({ name: 'purchase_bill_id', type: 'uuid' })
  purchaseBillId: string;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount: string;
}
