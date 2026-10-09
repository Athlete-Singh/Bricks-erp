import { Column, Entity } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

@Entity('units')
export class Unit extends TenantBaseEntity {
  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'varchar', length: 20 })
  abbreviation: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
