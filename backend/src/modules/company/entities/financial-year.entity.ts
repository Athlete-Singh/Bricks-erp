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

  @Column({ name: 'is_locked', type: 'boolean', default: false })
  isLocked: boolean;
}
