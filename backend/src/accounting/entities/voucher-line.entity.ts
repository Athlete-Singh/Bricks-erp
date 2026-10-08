import { Column, Entity } from 'typeorm';
import { TenantBaseEntity } from '../../common/entities/base.entity';

/**
 * One leg of a journal. Exactly one of `debit`/`credit` is greater than zero —
 * enforced by a CHECK constraint, not only by the service.
 */
@Entity('voucher_lines')
export class VoucherLine extends TenantBaseEntity {
  @Column({ name: 'voucher_id', type: 'uuid' })
  voucherId: string;

  @Column({ name: 'ledger_id', type: 'uuid' })
  ledgerId: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  debit: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  credit: string;

  /** Party this leg belongs to, for party ledger statements (P3). */
  @Column({ name: 'party_id', type: 'uuid', nullable: true })
  partyId: string | null;

  /** Kiln tag, so costs can be reported per kiln (CST-01). */
  @Column({ name: 'site_id', type: 'uuid', nullable: true })
  siteId: string | null;

  @Column({ type: 'text', nullable: true })
  narration: string | null;

  /** Keeps the lines in the order the user entered them. */
  @Column({ name: 'line_order', type: 'integer', default: 0 })
  lineOrder: number;
}
