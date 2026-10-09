import { Column, Entity } from 'typeorm';
import type { GstScheme } from '@brics/shared';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('companies')
export class Company extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 15, nullable: true })
  gstin: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  pan: string | null;

  @Column({ name: 'state_code', type: 'varchar', length: 2, default: '09' })
  stateCode: string;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ name: 'logo_url', type: 'varchar', length: 512, nullable: true })
  logoUrl: string | null;

  @Column({ name: 'gst_scheme', type: 'varchar', length: 30, default: 'regular_12_itc' })
  gstScheme: GstScheme;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
