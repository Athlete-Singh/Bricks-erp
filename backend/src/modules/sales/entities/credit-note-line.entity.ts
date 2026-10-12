import { Column, Entity } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

@Entity('credit_note_lines')
export class CreditNoteLine extends TenantBaseEntity {
  @Column({ name: 'credit_note_id', type: 'uuid' })
  creditNoteId: string;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  /** Null for a value-only credit (price adjustment); set when bricks come back. */
  @Column({ name: 'warehouse_id', type: 'uuid', nullable: true })
  warehouseId: string | null;

  @Column({ type: 'numeric', precision: 18, scale: 3, nullable: true })
  quantity: string | null;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  rate: string;

  @Column({ name: 'taxable_amount', type: 'numeric', precision: 18, scale: 2 })
  taxableAmount: string;

  @Column({ name: 'cgst_rate', type: 'numeric', precision: 5, scale: 2, default: 0 })
  cgstRate: string;

  @Column({ name: 'sgst_rate', type: 'numeric', precision: 5, scale: 2, default: 0 })
  sgstRate: string;

  @Column({ name: 'igst_rate', type: 'numeric', precision: 5, scale: 2, default: 0 })
  igstRate: string;

  @Column({ name: 'tax_amount', type: 'numeric', precision: 18, scale: 2, default: 0 })
  taxAmount: string;

  @Column({ name: 'stock_movement_id', type: 'uuid', nullable: true })
  stockMovementId: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;
}
