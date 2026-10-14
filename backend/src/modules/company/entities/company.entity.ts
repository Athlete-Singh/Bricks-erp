import { Column, Entity } from 'typeorm';
import type { BillingCycle, GstScheme, SubscriptionStatus, TenantStatus } from '@brics/shared';
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

  /** S1.1 — tenant lifecycle; `suspended` is refused at sign-in (PLT-06). */
  @Column({ type: 'varchar', length: 20, default: 'trial' })
  status: TenantStatus;

  @Column({ name: 'plan_name', type: 'varchar', length: 80, nullable: true })
  planName: string | null;

  @Column({ name: 'trial_ends_at', type: 'date', nullable: true })
  trialEndsAt: string | null;

  @Column({ name: 'last_active_at', type: 'timestamptz', nullable: true })
  lastActiveAt: Date | null;

  /** S3.2 — per-tenant support approval requirement (PLT-10). */
  @Column({ name: 'require_support_approval', type: 'boolean', default: false })
  requireSupportApproval: boolean;

  @Column({ name: 'support_access_granted_until', type: 'timestamptz', nullable: true })
  supportAccessGrantedUntil: Date | null;

  @Column({ name: 'support_access_code', type: 'varchar', length: 32, nullable: true })
  supportAccessCode: string | null;

  /** S4 — billing, plans, subscription status and grace period (PLT-11). */
  @Column({ name: 'subscription_status', type: 'varchar', length: 32, default: 'trial' })
  subscriptionStatus: SubscriptionStatus;

  @Column({ name: 'billing_cycle', type: 'varchar', length: 32, default: 'monthly' })
  billingCycle: BillingCycle;

  @Column({ name: 'grace_period_days', type: 'integer', default: 7 })
  gracePeriodDays: number;
}
