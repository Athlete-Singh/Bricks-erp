import { Column, Entity } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

@Entity('brick_types')
export class BrickType extends TenantBaseEntity {
  @Column({ type: 'varchar', length: 50 })
  grade: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
