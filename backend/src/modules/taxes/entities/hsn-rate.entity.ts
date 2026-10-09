import { Entity, Column } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

@Entity('tax_hsn_rates')
export class HsnRate extends TenantBaseEntity {
  @Column({ name: 'hsn_code', length: 20 })
  hsnCode: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ name: 'cgst_rate', type: 'numeric', precision: 5, scale: 2, default: 0 })
  cgstRate: number;

  @Column({ name: 'sgst_rate', type: 'numeric', precision: 5, scale: 2, default: 0 })
  sgstRate: number;

  @Column({ name: 'igst_rate', type: 'numeric', precision: 5, scale: 2, default: 0 })
  igstRate: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
