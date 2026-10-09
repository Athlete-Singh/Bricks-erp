import { Entity, Column } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

@Entity('transport_drivers')
export class Driver extends TenantBaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ name: 'license_no', type: 'varchar', length: 50, nullable: true })
  licenseNo: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
