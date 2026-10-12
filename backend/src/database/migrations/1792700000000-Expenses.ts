import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P10.1a — expenses and the cash/bank instrument reference (EXP-01, EXP-02,
 * CSH-01). Hand-written, never generated (see AGENTS.md).
 *
 * One table, plus two changes to what already exists:
 *
 *  - `vouchers` gains `instrument_type` and `instrument_ref`, nullable, so a
 *    cheque number or UPI reference rides on the voucher that moved the money
 *    rather than being buried in a narration nobody can filter on (CSH-01).
 *  - Two expense ledgers that EXP-01 names but the P2 chart never had —
 *    machinery and food — seeded onto every existing company, the same
 *    backfill P8 did for its two income ledgers.
 */
export class Expenses1792700000000 implements MigrationInterface {
  name = 'Expenses1792700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "expenses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "expense_no" varchar(30) NOT NULL,
        "site_id" uuid NOT NULL,
        "category_ledger_id" uuid NOT NULL,
        "expense_date" date NOT NULL,
        "amount" numeric(18,2) NOT NULL,
        "mode" varchar(10) NOT NULL,
        "paid_from_ledger_id" uuid,
        "party_id" uuid,
        "instrument_type" varchar(10),
        "instrument_ref" varchar(80),
        "voucher_id" uuid NOT NULL,
        "description" varchar(500),
        "notes" text,
        CONSTRAINT "pk_expenses" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "expenses" ADD CONSTRAINT "chk_expenses_mode"
      CHECK ("mode" IN ('cash','bank','upi','credit'))
    `);
    await queryRunner.query(`
      ALTER TABLE "expenses" ADD CONSTRAINT "chk_expenses_amount_positive"
      CHECK ("amount" > 0)
    `);
    // Paid now names the account the money left; on credit names who is owed.
    // Neither, or both, would leave the register unable to answer "is this
    // settled?" — which is the whole point of recording the mode.
    await queryRunner.query(`
      ALTER TABLE "expenses" ADD CONSTRAINT "chk_expenses_paid_or_owed"
      CHECK (
        ("mode" = 'credit' AND "party_id" IS NOT NULL AND "paid_from_ledger_id" IS NULL)
        OR ("mode" <> 'credit' AND "paid_from_ledger_id" IS NOT NULL AND "party_id" IS NULL)
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "expenses" ADD CONSTRAINT "chk_expenses_instrument_type"
      CHECK ("instrument_type" IS NULL OR "instrument_type" IN ('cheque','upi','neft','rtgs','imps','card','cash'))
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_expenses_company_no" ON "expenses" ("company_id", "expense_no") WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`CREATE INDEX "idx_expenses_date" ON "expenses" ("company_id", "expense_date")`);
    await queryRunner.query(`CREATE INDEX "idx_expenses_category" ON "expenses" ("category_ledger_id")`);
    await queryRunner.query(`CREATE INDEX "idx_expenses_company" ON "expenses" ("company_id")`);

    for (const [column, ref] of [
      ['company_id', 'companies'],
      ['site_id', 'sites'],
      ['category_ledger_id', 'ledgers'],
      ['paid_from_ledger_id', 'ledgers'],
      ['party_id', 'parties'],
      ['voucher_id', 'vouchers'],
    ] as const) {
      await queryRunner.query(`
        ALTER TABLE "expenses" ADD CONSTRAINT "fk_expenses_${column}"
        FOREIGN KEY ("${column}") REFERENCES "${ref}"("id") ON DELETE RESTRICT
      `);
    }

    // ── CSH-01: the instrument that moved the money ──────────────────────────
    await queryRunner.query(`ALTER TABLE "vouchers" ADD COLUMN "instrument_type" varchar(10)`);
    await queryRunner.query(`ALTER TABLE "vouchers" ADD COLUMN "instrument_ref" varchar(80)`);
    await queryRunner.query(`
      ALTER TABLE "vouchers" ADD CONSTRAINT "chk_vouchers_instrument_type"
      CHECK ("instrument_type" IS NULL OR "instrument_type" IN ('cheque','upi','neft','rtgs','imps','card','cash'))
    `);
    // Reconciling a bank statement means finding one cheque number fast.
    await queryRunner.query(`
      CREATE INDEX "idx_vouchers_instrument_ref" ON "vouchers" ("company_id", "instrument_ref")
      WHERE "instrument_ref" IS NOT NULL
    `);

    // ── EXP-01: the two categories the chart was missing ─────────────────────
    // Same backfill shape as P8's income ledgers: every existing company gets
    // them, so an expense entered today cannot fail with LEDGER_NOT_FOUND.
    for (const [code, name] of [
      ['MACHINERY_REPAIRS', 'Machinery & Equipment'],
      ['FOOD_EXPENSES', 'Food & Khurak'],
    ] as const) {
      await queryRunner.query(
        `
        INSERT INTO "ledgers" ("company_id", "group_id", "code", "name", "is_system")
        SELECT g."company_id", g."id", $1::varchar, $2::varchar, true
          FROM "ledger_groups" g
         WHERE g."code" = 'INDIRECT_EXPENSES'
           AND NOT EXISTS (
             SELECT 1 FROM "ledgers" l WHERE l."company_id" = g."company_id" AND l."code" = $1::varchar
           )
        `,
        [code, name],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "ledgers" WHERE "code" IN ('MACHINERY_REPAIRS','FOOD_EXPENSES')`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_vouchers_instrument_ref"`);
    await queryRunner.query(`ALTER TABLE "vouchers" DROP CONSTRAINT IF EXISTS "chk_vouchers_instrument_type"`);
    await queryRunner.query(`ALTER TABLE "vouchers" DROP COLUMN IF EXISTS "instrument_ref"`);
    await queryRunner.query(`ALTER TABLE "vouchers" DROP COLUMN IF EXISTS "instrument_type"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "expenses"`);
  }
}
