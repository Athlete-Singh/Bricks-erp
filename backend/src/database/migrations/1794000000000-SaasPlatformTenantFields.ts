import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * S1.1 — tenant lifecycle fields on `companies` (PLT-01). Hand-written, never
 * generated (see AGENTS.md).
 *
 * `status` is the authoritative lifecycle flag; `is_active` stays for one
 * release so earlier call sites that still read it keep working. The CHECK
 * constraint matches `TENANT_STATUSES` in @brics/shared — change both or
 * neither.
 *
 * Existing tenants are backfilled to `active`: a company that is already live
 * is, by definition, not on trial and not suspended.
 */
export class SaasPlatformTenantFields1794000000000 implements MigrationInterface {
  name = 'SaasPlatformTenantFields1794000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "companies"
        ADD COLUMN "status" varchar(20) NOT NULL DEFAULT 'trial',
        ADD COLUMN "plan_name" varchar(80),
        ADD COLUMN "trial_ends_at" date,
        ADD COLUMN "last_active_at" TIMESTAMP WITH TIME ZONE
    `);

    await queryRunner.query(`UPDATE "companies" SET "status" = 'active'`);

    await queryRunner.query(`
      ALTER TABLE "companies"
        ADD CONSTRAINT "companies_status_check"
        CHECK ("status" IN ('trial', 'active', 'suspended'))
    `);

    await queryRunner.query(`CREATE INDEX "idx_companies_status" ON "companies" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_companies_status"`);
    await queryRunner.query(`ALTER TABLE "companies" DROP CONSTRAINT IF EXISTS "companies_status_check"`);
    await queryRunner.query(`
      ALTER TABLE "companies"
        DROP COLUMN IF EXISTS "last_active_at",
        DROP COLUMN IF EXISTS "trial_ends_at",
        DROP COLUMN IF EXISTS "plan_name",
        DROP COLUMN IF EXISTS "status"
    `);
  }
}
