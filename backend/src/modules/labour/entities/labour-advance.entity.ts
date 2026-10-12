import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';
import { Party } from '../../parties/entities/party.entity';
import { Worker } from './worker.entity';

@Entity('labour_advances')
export class LabourAdvance extends TenantBaseEntity {
  @Column({ name: 'site_id', type: 'uuid' })
  siteId!: string;

  @Column({ name: 'fy_id', type: 'uuid' })
  fyId!: string;

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

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount!: string;

  @Column({ name: 'payment_mode', type: 'varchar', length: 20 })
  paymentMode!: string;

  @Column({ name: 'cash_bank_ledger_id', type: 'uuid' })
  cashBankLedgerId!: string;

  @Column({ name: 'voucher_id', type: 'uuid', nullable: true })
  voucherId?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remarks?: string | null;
}
