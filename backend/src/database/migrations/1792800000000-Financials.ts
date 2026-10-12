import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P10.1b — closing stock rates and the year-end close (ACC-08, ACC-10).
 * Hand-written, never generated (see AGENTS.md).
 *
 * One table and two columns. Everything else P10.1b ships is a read over what
 * is already posted: the P&L, the Balance Sheet and the party summary compute
 * from `voucher_lines` and the ledger-group nature, so they store nothing.
 *
 * `financial_years` gains `closed_at` and `closed_by`, because "locked" and
 * "closed" are not the same thing: a year can be locked against entry and
 * re-opened, but a year that was closed had its balances carried into the next
 * one, and doing that twice would double every opening balance.
 */
export class Financials1792800000000 implements MigrationInterface {
  name = 'Financials1792800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "closing_stock_rates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "as_of" date NOT NULL,
        "item_id" uuid NOT NULL,
        "rate" numeric(18,2) NOT NULL,
        CONSTRAINT "pk_closing_stock_rates" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "closing_stock_rates" ADD CONSTRAINT "chk_closing_stock_rates_rate_positive"
      CHECK ("rate" > 0)
    `);
    // One rate per grade per valuation date — two would make the statement
    // depend on which row the query happened to read.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_closing_stock_rates_item_date" ON "closing_stock_rates" ("company_id", "as_of", "item_id") WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`CREATE INDEX "idx_closing_stock_rates_company" ON "closing_stock_rates" ("company_id")`);
    await queryRunner.query(`
      ALTER TABLE "closing_stock_rates" ADD CONSTRAINT "fk_closing_stock_rates_company_id"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "closing_stock_rates" ADD CONSTRAINT "fk_closing_stock_rates_item_id"
      FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT
    `);

    // ── ACC-10: closed is not the same as locked ─────────────────────────────
    await queryRunner.query(`ALTER TABLE "financial_years" ADD COLUMN "closed_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "financial_years" ADD COLUMN "closed_by" uuid`);
    // A closed year is locked by definition — re-opening it for entry would
    // leave the next year's opening balances describing a past that changed.
    await queryRunner.query(`
      ALTER TABLE "financial_years" ADD CONSTRAINT "chk_financial_years_closed_is_locked"
      CHECK ("closed_at" IS NULL OR "is_locked" = true)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "financial_years" DROP CONSTRAINT IF EXISTS "chk_financial_years_closed_is_locked"`,
    );
    await queryRunner.query(`ALTER TABLE "financial_years" DROP COLUMN IF EXISTS "closed_by"`);
    await queryRunner.query(`ALTER TABLE "financial_years" DROP COLUMN IF EXISTS "closed_at"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "closing_stock_rates"`);
  }
}
