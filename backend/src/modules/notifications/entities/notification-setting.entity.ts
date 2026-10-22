import { Column, Entity } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';

/** NTF-01 — which alerts a company has on, and where owner alerts go. */
@Entity('notification_settings')
export class NotificationSetting extends TenantBaseEntity {
  @Column({ name: 'owner_phone', type: 'varchar', length: 20, nullable: true })
  ownerPhone: string | null;

  @Column({ name: 'dispatch_sent', type: 'boolean', default: false })
  dispatchSent: boolean;

  @Column({ name: 'payment_received', type: 'boolean', default: false })
  paymentReceived: boolean;

  @Column({ name: 'advance_alert', type: 'boolean', default: false })
  advanceAlert: boolean;
}
