import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * S4 — SaaS platform billing, subscriptions, invoices, and payment tracking (PLT-11).
 * Hand-written, never generated (see AGENTS.md).
 *
 * Adds subscription columns to `companies`:
 * - `subscription_status`: 'trial' | 'active' | 'past_due' | 'canceled'
 * - `billing_cycle`: 'monthly' | 'yearly' | 'custom'
 * - `grace_period_days`: integer days before overdue invoice or trial expiry leads to suspension
 *
 * Adds table `platform_invoices`:
 * - System-level platform invoices issued to tenant companies for SaaS usage.
 * - Stored with exact numeric(18,2) decimal amounts, GST breakdown, payment status, and audit timestamps.
 */
export class PlatformBilling1797000000000 implements MigrationInterface {
  name = 'PlatformBilling1797000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Companies subscription metadata
    await queryRunner.query(`
      ALTER TABLE "companies"
        ADD COLUMN "subscription_status" varchar(32) NOT NULL DEFAULT 'trial',
        ADD COLUMN "billing_cycle" varchar(32) NOT NULL DEFAULT 'monthly',
        ADD COLUMN "grace_period_days" integer NOT NULL DEFAULT 7
    `);

    // Backfill existing active companies to subscription_status 'active'
    await queryRunner.query(`
      UPDATE "companies"
      SET "subscription_status" = 'active'
      WHERE "status" = 'active'
    `);

    await queryRunner.query(`
      ALTER TABLE "companies"
        ADD CONSTRAINT "chk_companies_subscription_status"
          CHECK ("subscription_status" IN ('trial', 'active', 'past_due', 'canceled')),
        ADD CONSTRAINT "chk_companies_billing_cycle"
          CHECK ("billing_cycle" IN ('monthly', 'yearly', 'custom')),
        ADD CONSTRAINT "chk_companies_grace_period"
          CHECK ("grace_period_days" >= 0)
    `);

    await queryRunner.query(`CREATE INDEX "idx_companies_subscription_status" ON "companies" ("subscription_status")`);

    // 2. Platform invoices table
    await queryRunner.query(`
      CREATE TABLE "platform_invoices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "invoice_number" varchar(64) NOT NULL,
        "amount" numeric(18,2) NOT NULL,
        "tax_amount" numeric(18,2) NOT NULL DEFAULT 0.00,
        "total_amount" numeric(18,2) NOT NULL,
        "status" varchar(32) NOT NULL DEFAULT 'pending',
        "plan_name" varchar(64) NOT NULL,
        "billing_cycle" varchar(32) NOT NULL DEFAULT 'monthly',
        "period_start" TIMESTAMP WITH TIME ZONE NOT NULL,
        "period_end" TIMESTAMP WITH TIME ZONE NOT NULL,
        "due_date" date NOT NULL,
        "paid_at" TIMESTAMP WITH TIME ZONE,
        "payment_method" varchar(32),
        "payment_ref" varchar(64),
        "notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_platform_invoices" PRIMARY KEY ("id"),
        CONSTRAINT "fk_platform_invoices_company"
          FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "chk_platform_invoices_status"
          CHECK ("status" IN ('pending', 'paid', 'overdue', 'void')),
        CONSTRAINT "chk_platform_invoices_cycle"
          CHECK ("billing_cycle" IN ('monthly', 'yearly', 'custom')),
        CONSTRAINT "chk_platform_invoices_payment_method"
          CHECK ("payment_method" IS NULL OR "payment_method" IN ('upi', 'bank_transfer', 'card', 'cash', 'manual')),
        CONSTRAINT "chk_platform_invoices_amounts"
          CHECK ("amount" >= 0 AND "tax_amount" >= 0 AND "total_amount" >= 0)
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_platform_invoices_company_id" ON "platform_invoices" ("company_id")`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_platform_invoices_number" ON "platform_invoices" ("invoice_number")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_platform_invoices_status" ON "platform_invoices" ("status")`);
    await queryRunner.query(`CREATE INDEX "idx_platform_invoices_due_date" ON "platform_invoices" ("due_date")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "platform_invoices"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_companies_subscription_status"`);
    await queryRunner.query(`
      ALTER TABLE "companies"
        DROP CONSTRAINT IF EXISTS "chk_companies_grace_period",
        DROP CONSTRAINT IF EXISTS "chk_companies_billing_cycle",
        DROP CONSTRAINT IF EXISTS "chk_companies_subscription_status",
        DROP COLUMN IF EXISTS "grace_period_days",
        DROP COLUMN IF EXISTS "billing_cycle",
        DROP COLUMN IF EXISTS "subscription_status"
    `);
  }
}
