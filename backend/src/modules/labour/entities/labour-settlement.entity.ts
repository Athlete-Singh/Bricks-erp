import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';
import { Party } from '../../parties/entities/party.entity';

@Entity('labour_settlements')
export class LabourSettlement extends TenantBaseEntity {
  @Column({ name: 'site_id', type: 'uuid' })
  siteId!: string;

  @Column({ name: 'fy_id', type: 'uuid' })
  fyId!: string;

  @Column({ name: 'sardar_party_id', type: 'uuid' })
  sardarPartyId!: string;

  @ManyToOne(() => Party, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sardar_party_id' })
  sardarParty!: Party;

  @Column({ name: 'period_from', type: 'date' })
  periodFrom!: string;

  @Column({ name: 'period_to', type: 'date' })
  periodTo!: string;

  @Column({ name: 'gross_wages', type: 'numeric', precision: 18, scale: 2 })
  grossWages!: string;

  @Column({ name: 'advances_recovered', type: 'numeric', precision: 18, scale: 2 })
  advancesRecovered!: string;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  deductions!: string;

  @Column({ name: 'net_payable', type: 'numeric', precision: 18, scale: 2 })
  netPayable!: string;

  @Column({ type: 'varchar', length: 20 })
  status!: string;

  @Column({ name: 'voucher_id', type: 'uuid', nullable: true })
  voucherId?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remarks?: string | null;
}
