import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P1.1b hardening of the P1.1 tables.
 *
 * - Indexes on every `company_id` / FK the tenant queries filter by; without
 *   them each scoped read is a sequential scan.
 * - Uniqueness for the natural keys that had none, so duplicate memberships,
 *   kiln codes and permission grants become impossible.
 * - `roles.code` was globally unique while `roles.company_id` implied
 *   per-company roles. The unique key now covers both columns (NULLS NOT
 *   DISTINCT keeps system roles globally unique) so CP2 custom roles fit.
 * - `created_at` on the access tables, so granting and session history is
 *   auditable (AGENTS.md rule 7).
 */
export class AuthHardening1700000100000 implements MigrationInterface {
  name = 'AuthHardening1700000100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── timestamps on access tables ───────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "user_companies" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
      ALTER TABLE "user_sites"     ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
      ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
    `);

    // ── de-duplicate before adding the unique keys ────────────────────────────
    await queryRunner.query(`
      DELETE FROM "user_companies" a USING "user_companies" b
        WHERE a.ctid < b.ctid AND a."user_id" = b."user_id" AND a."company_id" = b."company_id";
      DELETE FROM "user_sites" a USING "user_sites" b
        WHERE a.ctid < b.ctid AND a."user_id" = b."user_id" AND a."site_id" = b."site_id";
      DELETE FROM "role_permissions" a USING "role_permissions" b
        WHERE a.ctid < b.ctid AND a."role_id" = b."role_id" AND a."permission_id" = b."permission_id";
    `);

    // ── uniqueness ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "UQ_roles_code";
      CREATE UNIQUE INDEX "UQ_roles_code_company" ON "roles" ("code", "company_id") NULLS NOT DISTINCT;

      ALTER TABLE "user_companies" ADD CONSTRAINT "UQ_user_companies_user_company" UNIQUE ("user_id", "company_id");
      ALTER TABLE "user_sites" ADD CONSTRAINT "UQ_user_sites_user_site" UNIQUE ("user_id", "site_id");
      ALTER TABLE "role_permissions" ADD CONSTRAINT "UQ_role_permissions_role_permission" UNIQUE ("role_id", "permission_id");

      -- Site codes are unique per company among live rows only, so a soft-deleted
      -- kiln does not block reusing its code.
      CREATE UNIQUE INDEX "UQ_sites_company_code" ON "sites" ("company_id", "code") WHERE "deleted_at" IS NULL;
    `);

    // ── indexes for tenant-scoped reads ───────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX "IDX_sites_company" ON "sites" ("company_id");
      CREATE INDEX "IDX_financial_years_company" ON "financial_years" ("company_id");
      CREATE INDEX "IDX_user_companies_user" ON "user_companies" ("user_id");
      CREATE INDEX "IDX_user_companies_company" ON "user_companies" ("company_id");
      CREATE INDEX "IDX_user_sites_user" ON "user_sites" ("user_id");
      CREATE INDEX "IDX_role_permissions_role" ON "role_permissions" ("role_id");
      CREATE INDEX "IDX_refresh_tokens_user" ON "refresh_tokens" ("user_id");
      CREATE INDEX "IDX_refresh_tokens_expires_at" ON "refresh_tokens" ("expires_at");
      CREATE INDEX "IDX_audit_logs_company_created" ON "audit_logs" ("company_id", "created_at" DESC);
      CREATE INDEX "IDX_audit_logs_entity" ON "audit_logs" ("entity_name", "entity_id");
      CREATE INDEX "IDX_audit_logs_user" ON "audit_logs" ("user_id");
    `);

    // ── financial years: at most one active per company ───────────────────────
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_financial_years_one_active"
        ON "financial_years" ("company_id")
        WHERE "is_active" = true AND "deleted_at" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_financial_years_one_active";
      DROP INDEX IF EXISTS "IDX_audit_logs_user";
      DROP INDEX IF EXISTS "IDX_audit_logs_entity";
      DROP INDEX IF EXISTS "IDX_audit_logs_company_created";
      DROP INDEX IF EXISTS "IDX_refresh_tokens_expires_at";
      DROP INDEX IF EXISTS "IDX_refresh_tokens_user";
      DROP INDEX IF EXISTS "IDX_role_permissions_role";
      DROP INDEX IF EXISTS "IDX_user_sites_user";
      DROP INDEX IF EXISTS "IDX_user_companies_company";
      DROP INDEX IF EXISTS "IDX_user_companies_user";
      DROP INDEX IF EXISTS "IDX_financial_years_company";
      DROP INDEX IF EXISTS "IDX_sites_company";
      DROP INDEX IF EXISTS "UQ_sites_company_code";

      ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "UQ_role_permissions_role_permission";
      ALTER TABLE "user_sites" DROP CONSTRAINT IF EXISTS "UQ_user_sites_user_site";
      ALTER TABLE "user_companies" DROP CONSTRAINT IF EXISTS "UQ_user_companies_user_company";

      DROP INDEX IF EXISTS "UQ_roles_code_company";
      ALTER TABLE "roles" ADD CONSTRAINT "UQ_roles_code" UNIQUE ("code");

      ALTER TABLE "refresh_tokens" DROP COLUMN IF EXISTS "created_at";
      ALTER TABLE "user_sites"     DROP COLUMN IF EXISTS "created_at";
      ALTER TABLE "user_companies" DROP COLUMN IF EXISTS "created_at";
    `);
  }
}
