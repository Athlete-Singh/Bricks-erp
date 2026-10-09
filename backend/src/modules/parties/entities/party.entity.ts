import { Column, Entity } from 'typeorm';
import type { PartyType } from '@brics/shared';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

@Entity('parties')
export class Party extends TenantBaseEntity {
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'party_types', type: 'text', array: true })
  partyTypes: PartyType[];

  @Column({ type: 'varchar', length: 15, nullable: true })
  gstin: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  pan: string | null;

  @Column({ name: 'state_code', type: 'varchar', length: 2, nullable: true })
  stateCode: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ name: 'opening_debit', type: 'numeric', precision: 18, scale: 2, default: 0 })
  openingDebit: string;

  @Column({ name: 'opening_credit', type: 'numeric', precision: 18, scale: 2, default: 0 })
  openingCredit: string;

  @Column({ name: 'ledger_id', type: 'uuid' })
  ledgerId: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
