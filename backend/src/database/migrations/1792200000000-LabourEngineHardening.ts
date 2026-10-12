import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Repairs the P6.1 labour schema. Hand-written, never generated (see AGENTS.md).
 *
 * Three classes of gap, all of which let money or data go wrong quietly:
 *
 *  1. **Nothing recorded that wages had been accrued.** `POST /labour/accrue-wages`
 *     reads production and attendance over a range and credits the Sardar, but
 *     kept no record of the range it had paid for — so a second call, or any
 *     overlapping range, posted the whole amount again. The service already
 *     audited against an entity called `labour_wage_accruals` that did not
 *     exist. It does now, and an overlap is refused against it.
 *  2. **Attendance had no uniqueness**, so the same worker could be marked
 *     present twice on one day and be paid twice for it.
 *  3. **Five of the six new tables had no foreign key to `companies`**, and two
 *     had no index on `company_id` — every other tenant table in this schema
 *     has both.
 */
export class LabourEngineHardening1792200000000 implements MigrationInterface {
  name = 'LabourEngineHardening1792200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "labour_wage_accruals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "site_id" uuid NOT NULL,
        "sardar_party_id" uuid NOT NULL,
        "period_from" date NOT NULL,
        "period_to" date NOT NULL,
        "gross_wages" numeric(18,2) NOT NULL,
        "voucher_id" uuid NOT NULL,
        CONSTRAINT "pk_labour_wage_accruals" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "labour_wage_accruals" ADD CONSTRAINT "chk_wage_accruals_period"
      CHECK ("period_to" >= "period_from")
    `);
    await queryRunner.query(`
      ALTER TABLE "labour_wage_accruals" ADD CONSTRAINT "chk_wage_accruals_gross_positive"
      CHECK ("gross_wages" > 0)
    `);
    await queryRunner.query(`CREATE INDEX "idx_labour_wage_accruals_company" ON "labour_wage_accruals" ("company_id")`);
    await queryRunner.query(
      `CREATE INDEX "idx_labour_wage_accruals_sardar_period" ON "labour_wage_accruals" ("sardar_party_id", "period_from", "period_to")`,
    );
    for (const [column, table, onDelete] of [
      ['company_id', 'companies', 'CASCADE'],
      ['site_id', 'sites', 'RESTRICT'],
      ['sardar_party_id', 'parties', 'RESTRICT'],
      ['voucher_id', 'vouchers', 'RESTRICT'],
    ]) {
      await queryRunner.query(`
        ALTER TABLE "labour_wage_accruals" ADD CONSTRAINT "fk_wage_accruals_${column}"
        FOREIGN KEY ("${column}") REFERENCES "${table}"("id") ON DELETE ${onDelete}
      `);
    }

    // ── 2. One attendance record per worker per day ──────────────────────────
    // Two partial indexes because `worker_id` is nullable: attendance may be
    // recorded for a whole gang or for a named worker, and a single index over
    // a nullable column would not constrain the gang-level rows at all.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_labour_attendance_worker_day"
      ON "labour_attendance" ("labour_group_id", "worker_id", "date")
      WHERE "worker_id" IS NOT NULL AND "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_labour_attendance_group_day"
      ON "labour_attendance" ("labour_group_id", "date")
      WHERE "worker_id" IS NULL AND "deleted_at" IS NULL
    `);

    // ── 3. Tenant plumbing the other tables already have ─────────────────────
    for (const table of [
      'workers',
      'labour_attendance',
      'labour_advances',
      'labour_deductions',
      'labour_settlements',
    ]) {
      await queryRunner.query(`
        ALTER TABLE "${table}" ADD CONSTRAINT "fk_${table}_company"
        FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
      `);
    }
    for (const table of ['workers', 'labour_settlements']) {
      await queryRunner.query(`CREATE INDEX "idx_${table}_company" ON "${table}" ("company_id")`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['workers', 'labour_settlements']) {
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_${table}_company"`);
    }
    for (const table of [
      'workers',
      'labour_attendance',
      'labour_advances',
      'labour_deductions',
      'labour_settlements',
    ]) {
      await queryRunner.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "fk_${table}_company"`);
    }
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."uq_labour_attendance_group_day"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."uq_labour_attendance_worker_day"`);
    await queryRunner.query(`DROP TABLE "labour_wage_accruals"`);
  }
}
