import { Column, Entity } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

@Entity('debit_note_lines')
export class DebitNoteLine extends TenantBaseEntity {
  @Column({ name: 'debit_note_id', type: 'uuid' })
  debitNoteId: string;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

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

  @Column({ type: 'text', nullable: true })
  description: string | null;
}
