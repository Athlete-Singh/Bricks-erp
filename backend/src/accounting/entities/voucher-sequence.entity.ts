import { Column, Entity } from 'typeorm';
import { TenantBaseEntity } from '../../common/entities/base.entity';

/**
 * The counter behind voucher numbers, one row per company + FY + type.
 *
 * A table rather than a Postgres sequence because numbering must be **gapless**:
 * a sequence hands out a number before the transaction commits, so a rollback
 * leaves a hole. GST invoice numbering cannot have holes. The row is taken with
 * `SELECT … FOR UPDATE`, so concurrent posts queue instead of colliding.
 */
@Entity('voucher_sequences')
export class VoucherSequence extends TenantBaseEntity {
  @Column({ name: 'financial_year_id', type: 'uuid' })
  financialYearId: string;

  @Column({ name: 'voucher_type_id', type: 'uuid' })
  voucherTypeId: string;

  @Column({ name: 'last_number', type: 'integer', default: 0 })
  lastNumber: number;
}
