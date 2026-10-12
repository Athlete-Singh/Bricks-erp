import { Column, Entity } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

/**
 * One wage accrual run (LAB-04).
 *
 * Exists so the same work cannot be paid for twice. Accrual reads production
 * and attendance over a date range and credits the Sardar, but nothing
 * recorded *that it had done so* — so a second call for the same range, or any
 * overlapping range, posted the whole amount again. An `Idempotency-Key` only
 * catches an identical retry, not a genuine second request.
 */
@Entity('labour_wage_accruals')
export class LabourWageAccrual extends TenantBaseEntity {
  @Column({ name: 'site_id', type: 'uuid' })
  siteId: string;

  @Column({ name: 'sardar_party_id', type: 'uuid' })
  sardarPartyId: string;

  @Column({ name: 'period_from', type: 'date' })
  periodFrom: string;

  @Column({ name: 'period_to', type: 'date' })
  periodTo: string;

  /** NUMERIC(18,2) carried as a string — never a float (CONVENTIONS). */
  @Column({ name: 'gross_wages', type: 'numeric', precision: 18, scale: 2 })
  grossWages: string;

  /** The journal this accrual posted, so the figure can be walked back. */
  @Column({ name: 'voucher_id', type: 'uuid' })
  voucherId: string;
}
