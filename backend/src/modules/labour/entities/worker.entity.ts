import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';
import { LabourGroup } from './labour-group.entity';

@Entity('workers')
export class Worker extends TenantBaseEntity {
  @Column({ name: 'labour_group_id', type: 'uuid' })
  labourGroupId!: string;

  @ManyToOne(() => LabourGroup, (g) => g.workers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'labour_group_id' })
  labourGroup!: LabourGroup;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string | null;

  @Column({ name: 'daily_wage_rate', type: 'numeric', precision: 18, scale: 2, nullable: true })
  dailyWageRate?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
