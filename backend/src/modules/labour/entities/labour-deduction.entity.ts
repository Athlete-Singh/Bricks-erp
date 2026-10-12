import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';
import { Party } from '../../parties/entities/party.entity';
import { Worker } from './worker.entity';

@Entity('labour_deductions')
export class LabourDeduction extends TenantBaseEntity {
  @Column({ name: 'site_id', type: 'uuid' })
  siteId!: string;

  @Column({ name: 'sardar_party_id', type: 'uuid' })
  sardarPartyId!: string;

  @ManyToOne(() => Party, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sardar_party_id' })
  sardarParty!: Party;

  @Column({ name: 'worker_id', type: 'uuid', nullable: true })
  workerId?: string | null;

  @ManyToOne(() => Worker, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'worker_id' })
  worker?: Worker | null;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'varchar', length: 50 })
  category!: string;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remarks?: string | null;
}
