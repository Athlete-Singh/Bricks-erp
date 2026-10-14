import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * S3.2 — per-tenant support approval fields on `companies` (PLT-10).
 * Hand-written, never generated (see AGENTS.md).
 *
 * `require_support_approval` defaults to false (the announce-after policy per ADR-052).
 * When true, platform support sessions are refused unless `support_access_granted_until`
 * is in the future, or the opener provides the matching `support_access_code`.
 */
export class RequireSupportApproval1796000000000 implements MigrationInterface {
  name = 'RequireSupportApproval1796000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "companies"
        ADD COLUMN "require_support_approval" boolean NOT NULL DEFAULT false,
        ADD COLUMN "support_access_granted_until" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN "support_access_code" varchar(32)
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_companies_support_approval" ON "companies" ("require_support_approval") WHERE "require_support_approval" = true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_companies_support_approval"`);
    await queryRunner.query(`
      ALTER TABLE "companies"
        DROP COLUMN IF EXISTS "support_access_code",
        DROP COLUMN IF EXISTS "support_access_granted_until",
        DROP COLUMN IF EXISTS "require_support_approval"
    `);
  }
}
