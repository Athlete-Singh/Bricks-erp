import { Column, Entity } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

@Entity('warehouses')
export class Warehouse extends TenantBaseEntity {
  @Column({ name: 'site_id', type: 'uuid' })
  siteId: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
