import { Column, Entity } from 'typeorm';
import type { ItemCategory } from '@brics/shared';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

@Entity('items')
export class Item extends TenantBaseEntity {
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  category: ItemCategory;

  @Column({ name: 'unit_id', type: 'uuid' })
  unitId: string;

  @Column({ name: 'hsn_id', type: 'uuid', nullable: true })
  hsnId: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
