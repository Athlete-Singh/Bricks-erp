import { Column, Entity } from 'typeorm';
import { TenantBaseEntity } from '../../common/entities/base.entity';

/** Receipt, Payment, Contra, Journal, Sales, Purchase, Credit Note, Debit Note. */
@Entity('voucher_types')
export class VoucherType extends TenantBaseEntity {
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  /** Leads the voucher number: `SAL/2026-27/000123`. */
  @Column({ type: 'varchar', length: 10 })
  prefix: string;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;
}
