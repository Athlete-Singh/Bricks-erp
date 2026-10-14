import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { BillingCycle, InvoiceStatus, PaymentMethod } from '@brics/shared';

/**
 * Platform invoice entity (S4 / PLT-11).
 * Tracks subscription invoices billed by the platform to tenant companies.
 */
@Entity('platform_invoices')
export class PlatformInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'invoice_number', type: 'varchar', length: 64 })
  invoiceNumber: string;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount: string;

  @Column({ name: 'tax_amount', type: 'numeric', precision: 18, scale: 2, default: '0.00' })
  taxAmount: string;

  @Column({ name: 'total_amount', type: 'numeric', precision: 18, scale: 2 })
  totalAmount: string;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status: InvoiceStatus;

  @Column({ name: 'plan_name', type: 'varchar', length: 64 })
  planName: string;

  @Column({ name: 'billing_cycle', type: 'varchar', length: 32, default: 'monthly' })
  billingCycle: BillingCycle;

  @Column({ name: 'period_start', type: 'timestamptz' })
  periodStart: Date;

  @Column({ name: 'period_end', type: 'timestamptz' })
  periodEnd: Date;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @Column({ name: 'payment_method', type: 'varchar', length: 32, nullable: true })
  paymentMethod: PaymentMethod | null;

  @Column({ name: 'payment_ref', type: 'varchar', length: 64, nullable: true })
  paymentRef: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
