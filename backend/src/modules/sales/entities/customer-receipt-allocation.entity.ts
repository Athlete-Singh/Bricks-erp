import { Column, Entity } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

@Entity('customer_receipt_allocations')
export class CustomerReceiptAllocation extends TenantBaseEntity {
  @Column({ name: 'customer_receipt_id', type: 'uuid' })
  customerReceiptId: string;

  @Column({ name: 'sales_invoice_id', type: 'uuid' })
  salesInvoiceId: string;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount: string;
}
