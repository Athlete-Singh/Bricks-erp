import { Entity, Column, Index } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';
import { VehicleType, VehicleOwnerType } from '@brics/shared';

@Entity('transport_vehicles')
export class Vehicle extends TenantBaseEntity {
  @Column({ name: 'registration_no', length: 50 })
  registrationNo: string;

  @Column({ type: 'varchar', length: 20 })
  type: VehicleType;

  @Column({ name: 'owner_type', type: 'varchar', length: 20 })
  ownerType: VehicleOwnerType;

  @Column({ name: 'party_id', type: 'uuid', nullable: true })
  @Index()
  partyId: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
