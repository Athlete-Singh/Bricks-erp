import { Entity, Column } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';
import { WageActivity } from '@brics/shared';

@Entity('labour_wage_rates')
export class WageRate extends TenantBaseEntity {
  @Column({ type: 'varchar', length: 50 })
  activity: WageActivity;

  @Column({ length: 50 })
  unit: string;

  @Column({ name: 'rate_amount', type: 'numeric', precision: 18, scale: 2 })
  rateAmount: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
