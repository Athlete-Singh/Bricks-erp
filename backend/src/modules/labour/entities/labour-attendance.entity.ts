import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';
import { LabourGroup } from './labour-group.entity';
import { Worker } from './worker.entity';

@Entity('labour_attendance')
export class LabourAttendance extends TenantBaseEntity {
  @Column({ name: 'site_id', type: 'uuid' })
  siteId!: string;

  @Column({ type: 'date' })
  date!: string;

  @Column({ name: 'labour_group_id', type: 'uuid' })
  labourGroupId!: string;

  @ManyToOne(() => LabourGroup, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'labour_group_id' })
  labourGroup!: LabourGroup;

  @Column({ name: 'worker_id', type: 'uuid', nullable: true })
  workerId?: string | null;

  @ManyToOne(() => Worker, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'worker_id' })
  worker?: Worker | null;

  @Column({ type: 'varchar', length: 20 })
  status!: string;

  @Column({ name: 'overtime_hours', type: 'numeric', precision: 5, scale: 2, default: '0.00' })
  overtimeHours!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remarks?: string | null;
}
