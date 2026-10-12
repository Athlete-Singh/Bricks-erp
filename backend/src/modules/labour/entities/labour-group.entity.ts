import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';
import { Party } from '../../parties/entities/party.entity';
import { Site } from '../../company/entities/site.entity';
import { Worker } from './worker.entity';

@Entity('labour_groups')
export class LabourGroup extends TenantBaseEntity {
  @Column({ name: 'site_id', type: 'uuid', nullable: true })
  siteId?: string | null;

  @ManyToOne(() => Site, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'site_id' })
  site?: Site | null;

  @Column({ name: 'sardar_party_id', type: 'uuid' })
  sardarPartyId!: string;

  @ManyToOne(() => Party, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sardar_party_id' })
  sardarParty!: Party;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 50 })
  activity!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => Worker, (w) => w.labourGroup)
  workers?: Worker[];
}
