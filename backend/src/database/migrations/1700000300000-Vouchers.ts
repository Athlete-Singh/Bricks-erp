import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P2.1b — the journal (ACC-02, ACC-03).
 *
 * The invariants that matter are CHECK constraints, not just service code: a
 * line carries a debit or a credit but never both, amounts are never negative,
 * and voucher numbers are unique per company. If a later module ever writes
 * around `PostingService`, the database still refuses a malformed journal.
 */
export class Vouchers1700000300000 implements MigrationInterface {
  name = 'Vouchers1700000300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "vouchers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "voucher_type_id" uuid NOT NULL,
        "financial_year_id" uuid NOT NULL,
        "number" character varying(50) NOT NULL,
        "voucher_date" date NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'posted',
        "narration" text,
        "site_id" uuid,
        "source_type" character varying(50),
        "source_id" uuid,
        "reversal_of_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by" uuid,
        "updated_by" uuid,
        CONSTRAINT "PK_vouchers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_vouchers_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_vouchers_type" FOREIGN KEY ("voucher_type_id") REFERENCES "voucher_types"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_vouchers_financial_year" FOREIGN KEY ("financial_year_id") REFERENCES "financial_years"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_vouchers_site" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_vouchers_reversal_of" FOREIGN KEY ("reversal_of_id") REFERENCES "vouchers"("id") ON DELETE RESTRICT,
        CONSTRAINT "CK_vouchers_status" CHECK ("status" IN ('posted','reversed'))
      );

      CREATE TABLE "voucher_lines" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "voucher_id" uuid NOT NULL,
        "ledger_id" uuid NOT NULL,
        "debit" numeric(18,2) NOT NULL DEFAULT 0,
        "credit" numeric(18,2) NOT NULL DEFAULT 0,
        "party_id" uuid,
        "site_id" uuid,
        "narration" text,
        "line_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by" uuid,
        "updated_by" uuid,
        CONSTRAINT "PK_voucher_lines" PRIMARY KEY ("id"),
        CONSTRAINT "FK_voucher_lines_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_voucher_lines_voucher" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_voucher_lines_ledger" FOREIGN KEY ("ledger_id") REFERENCES "ledgers"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_voucher_lines_site" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL,
        CONSTRAINT "CK_voucher_lines_not_negative" CHECK ("debit" >= 0 AND "credit" >= 0),
        -- A leg is a debit or a credit, never both and never neither.
        CONSTRAINT "CK_voucher_lines_one_side" CHECK (("debit" > 0 AND "credit" = 0) OR ("credit" > 0 AND "debit" = 0))
      );

      CREATE TABLE "voucher_sequences" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "financial_year_id" uuid NOT NULL,
        "voucher_type_id" uuid NOT NULL,
        "last_number" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by" uuid,
        "updated_by" uuid,
        CONSTRAINT "PK_voucher_sequences" PRIMARY KEY ("id"),
        CONSTRAINT "FK_voucher_sequences_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_voucher_sequences_financial_year" FOREIGN KEY ("financial_year_id") REFERENCES "financial_years"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_voucher_sequences_type" FOREIGN KEY ("voucher_type_id") REFERENCES "voucher_types"("id") ON DELETE CASCADE,
        CONSTRAINT "CK_voucher_sequences_not_negative" CHECK ("last_number" >= 0)
      );
    `);

    await queryRunner.query(`
      -- A voucher number identifies a voucher within its company. Unique even
      -- across soft-deleted rows: a reused number would break an audit trail.
      CREATE UNIQUE INDEX "UQ_vouchers_company_number" ON "vouchers" ("company_id", "number");
      -- One counter per company + FY + type.
      CREATE UNIQUE INDEX "UQ_voucher_sequences_scope" ON "voucher_sequences" ("company_id", "financial_year_id", "voucher_type_id");
      -- A voucher can be reversed once.
      CREATE UNIQUE INDEX "UQ_vouchers_reversal_of" ON "vouchers" ("reversal_of_id") WHERE "reversal_of_id" IS NOT NULL;

      -- Day Book and date-range reports.
      CREATE INDEX "IDX_vouchers_company_date" ON "vouchers" ("company_id", "voucher_date" DESC);
      CREATE INDEX "IDX_vouchers_financial_year" ON "vouchers" ("financial_year_id");
      CREATE INDEX "IDX_vouchers_type" ON "vouchers" ("voucher_type_id");
      -- "Which journal did this invoice create?"
      CREATE INDEX "IDX_vouchers_source" ON "vouchers" ("source_type", "source_id");
      -- Ledger statements and the trial balance.
      CREATE INDEX "IDX_voucher_lines_ledger" ON "voucher_lines" ("ledger_id");
      CREATE INDEX "IDX_voucher_lines_voucher" ON "voucher_lines" ("voucher_id");
      CREATE INDEX "IDX_voucher_lines_party" ON "voucher_lines" ("party_id") WHERE "party_id" IS NOT NULL;
      CREATE INDEX "IDX_voucher_lines_site" ON "voucher_lines" ("site_id") WHERE "site_id" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "voucher_sequences";
      DROP TABLE "voucher_lines";
      DROP TABLE "vouchers";
    `);
  }
}
