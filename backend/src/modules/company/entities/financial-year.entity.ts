import { Column, Entity } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

@Entity('financial_years')
export class FinancialYear extends TenantBaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string; // e.g., "FY 2025-26"

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /**
   * ACC-10 — closed is stronger than locked: a closed year has had its balances
   * carried into the next one, and carrying them twice would double every
   * opening balance.
   */
  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @Column({ name: 'closed_by', type: 'uuid', nullable: true })
  closedBy: string | null;

  @Column({ name: 'is_locked', type: 'boolean', default: false })
  isLocked: boolean;
}
