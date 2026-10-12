import { Column, Entity } from 'typeorm';
import type { SalesChargeKind } from '@brics/shared';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

/**
 * Loading / transport / other charges on quotations, orders and invoices.
 * Composite supply (OQ #17): taxed at whatever GST the owner enters, which on
 * a brick kiln invoice normally mirrors the brick line.
 *
 * One table across the three parents keeps the schema narrow; the pair
 * (`parent_type`, `parent_id`) identifies which document a charge belongs to.
 */
@Entity('sales_charges')
export class SalesCharge extends TenantBaseEntity {
  /** 'quotation' | 'sales_order' | 'sales_invoice' */
  @Column({ name: 'parent_type', type: 'varchar', length: 20 })
  parentType: 'quotation' | 'sales_order' | 'sales_invoice';

  @Column({ name: 'parent_id', type: 'uuid' })
  parentId: string;

  @Column({ type: 'varchar', length: 20 })
  kind: SalesChargeKind;

  @Column({ type: 'varchar', length: 80 })
  label: string;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount: string;

  @Column({ name: 'cgst_rate', type: 'numeric', precision: 5, scale: 2, default: 0 })
  cgstRate: string;

  @Column({ name: 'sgst_rate', type: 'numeric', precision: 5, scale: 2, default: 0 })
  sgstRate: string;

  @Column({ name: 'igst_rate', type: 'numeric', precision: 5, scale: 2, default: 0 })
  igstRate: string;

  @Column({ name: 'cgst_amount', type: 'numeric', precision: 18, scale: 2, default: 0 })
  cgstAmount: string;

  @Column({ name: 'sgst_amount', type: 'numeric', precision: 18, scale: 2, default: 0 })
  sgstAmount: string;

  @Column({ name: 'igst_amount', type: 'numeric', precision: 18, scale: 2, default: 0 })
  igstAmount: string;
}
