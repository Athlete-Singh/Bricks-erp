import { Column, Entity } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

@Entity('brick_types')
export class BrickType extends TenantBaseEntity {
  @Column({ type: 'varchar', length: 50 })
  grade: string;

  /**
   * The item this grade is stocked and sold as (ADR-051). One grade, one item:
   * production sorts into it and a sale takes out of it, so the yard has a
   * single balance instead of two that cannot be reconciled.
   */
  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
