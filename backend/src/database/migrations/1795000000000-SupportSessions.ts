import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * S2.1 — support sessions (PLT-07) and the trail that marks what a platform
 * admin did under one (PLT-08). Hand-written, never generated (see AGENTS.md).
 *
 * `support_sessions` is the record of a break-glass visit: who looked, at
 * which tenant, why, when, for how long, closed when and how. One row per
 * window of access. The partial unique says a platform admin can only hold
 * one open session per tenant at a time — overlapping sessions would make
 * the audit trail argue with itself.
 *
 * `audit_logs` gains two columns so an owner's audit screen can tell what
 * support's entries are from everybody else's. `actor_kind` defaults to
 * `'user'` and backfills to it, so every existing row is correctly tagged
 * as an ordinary business entry.
 */
export class SupportSessions1795000000000 implements MigrationInterface {
  name = 'SupportSessions1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "support_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "platform_user_id" uuid NOT NULL,
        "reason" text NOT NULL,
        "opened_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "closed_at" TIMESTAMP WITH TIME ZONE,
        "closed_by" varchar(20),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_support_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "fk_support_sessions_company"
          FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_support_sessions_user"
          FOREIGN KEY ("platform_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "chk_support_sessions_reason_length"
          CHECK (char_length("reason") >= 3),
        CONSTRAINT "chk_support_sessions_closed_by"
          CHECK ("closed_by" IS NULL OR "closed_by" IN ('manual', 'expiry')),
        CONSTRAINT "chk_support_sessions_closed_pair"
          CHECK (("closed_at" IS NULL) = ("closed_by" IS NULL)),
        CONSTRAINT "chk_support_sessions_window"
          CHECK ("expires_at" > "opened_at")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_support_sessions_company" ON "support_sessions" ("company_id")`);
    await queryRunner.query(
      `CREATE INDEX "idx_support_sessions_platform_user" ON "support_sessions" ("platform_user_id")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_support_sessions_expires_at" ON "support_sessions" ("expires_at")`);
    // One open session per (platform user, tenant). A second request to open
    // one is answered by returning the existing session, not by stacking.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_support_sessions_open" ON "support_sessions" ("platform_user_id", "company_id") WHERE "closed_at" IS NULL`,
    );

    await queryRunner.query(`
      ALTER TABLE "audit_logs"
        ADD COLUMN "actor_kind" varchar(20) NOT NULL DEFAULT 'user',
        ADD COLUMN "support_session_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
        ADD CONSTRAINT "chk_audit_logs_actor_kind"
        CHECK ("actor_kind" IN ('user', 'platform_support', 'system'))
    `);
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
        ADD CONSTRAINT "fk_audit_logs_support_session"
        FOREIGN KEY ("support_session_id") REFERENCES "support_sessions"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
        ADD CONSTRAINT "chk_audit_logs_support_kind_pair"
        CHECK (
          ("actor_kind" = 'platform_support') = ("support_session_id" IS NOT NULL)
        )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_audit_logs_support_session" ON "audit_logs" ("company_id", "support_session_id") WHERE "support_session_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_support_session"`);
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "chk_audit_logs_support_kind_pair"`);
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "fk_audit_logs_support_session"`);
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "chk_audit_logs_actor_kind"`);
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
        DROP COLUMN IF EXISTS "support_session_id",
        DROP COLUMN IF EXISTS "actor_kind"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "support_sessions"`);
  }
}
