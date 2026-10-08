import { Column, Entity } from 'typeorm';
import { TenantBaseEntity } from '../../common/entities/base.entity';

/** A posted voucher is never edited — correction is a reversal (ACC-02). */
export type VoucherStatus = 'posted' | 'reversed';

@Entity('vouchers')
export class Voucher extends TenantBaseEntity {
  @Column({ name: 'voucher_type_id', type: 'uuid' })
  voucherTypeId: string;

  @Column({ name: 'financial_year_id', type: 'uuid' })
  financialYearId: string;

  /** Gapless per company + FY + type, e.g. `JNL/2026-27/000001`. */
  @Column({ type: 'varchar', length: 50 })
  number: string;

  @Column({ name: 'voucher_date', type: 'date' })
  voucherDate: string;

  @Column({ type: 'varchar', length: 20, default: 'posted' })
  status: VoucherStatus;

  @Column({ type: 'text', nullable: true })
  narration: string | null;

  /** The kiln this voucher belongs to, where one applies. */
  @Column({ name: 'site_id', type: 'uuid', nullable: true })
  siteId: string | null;

  // What produced this voucher — `sales_invoice`, `grn`, `wage_settlement`…
  // Null for a manual voucher. Lets a document find its journal and vice versa.
  @Column({ name: 'source_type', type: 'varchar', length: 50, nullable: true })
  sourceType: string | null;

  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  sourceId: string | null;

  /** Set on the reversing voucher, pointing at the one it cancels. */
  @Column({ name: 'reversal_of_id', type: 'uuid', nullable: true })
  reversalOfId: string | null;
}
