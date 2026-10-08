import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P2.1a — the chart of accounts (ACC-01) and opening balances (ACC-04).
 *
 * Groups, ledgers and voucher types are per company: each tenant gets its own
 * copy at creation, so renaming a ledger in one company cannot affect another.
 */
export class ChartOfAccounts1700000200000 implements MigrationInterface {
  name = 'ChartOfAccounts1700000200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ledger_groups" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "name" character varying(100) NOT NULL,
        "code" character varying(50) NOT NULL,
        "parent_id" uuid,
        "nature" character varying(20) NOT NULL,
        "is_direct" boolean NOT NULL DEFAULT false,
        "is_system" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by" uuid,
        "updated_by" uuid,
        CONSTRAINT "PK_ledger_groups" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ledger_groups_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ledger_groups_parent" FOREIGN KEY ("parent_id") REFERENCES "ledger_groups"("id") ON DELETE RESTRICT,
        CONSTRAINT "CK_ledger_groups_nature" CHECK ("nature" IN ('asset','liability','income','expense'))
      );

      CREATE TABLE "ledgers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "group_id" uuid NOT NULL,
        "name" character varying(150) NOT NULL,
        "code" character varying(50),
        "party_id" uuid,
        "opening_debit" numeric(18,2) NOT NULL DEFAULT 0,
        "opening_credit" numeric(18,2) NOT NULL DEFAULT 0,
        "opening_financial_year_id" uuid,
        "is_system" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by" uuid,
        "updated_by" uuid,
        CONSTRAINT "PK_ledgers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ledgers_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ledgers_group" FOREIGN KEY ("group_id") REFERENCES "ledger_groups"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_ledgers_financial_year" FOREIGN KEY ("opening_financial_year_id") REFERENCES "financial_years"("id") ON DELETE SET NULL,
        -- Money is never negative here; the side carries the sign.
        CONSTRAINT "CK_ledgers_opening_not_negative" CHECK ("opening_debit" >= 0 AND "opening_credit" >= 0),
        -- A ledger opens on one side only, the way it is written in a book.
        CONSTRAINT "CK_ledgers_opening_one_side" CHECK ("opening_debit" = 0 OR "opening_credit" = 0)
      );

      CREATE TABLE "voucher_types" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "code" character varying(50) NOT NULL,
        "name" character varying(100) NOT NULL,
        "prefix" character varying(10) NOT NULL,
        "is_system" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by" uuid,
        "updated_by" uuid,
        CONSTRAINT "PK_voucher_types" PRIMARY KEY ("id"),
        CONSTRAINT "FK_voucher_types_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      -- Codes and names are unique per company among live rows, so a renamed or
      -- soft-deleted account does not block reusing its identity.
      CREATE UNIQUE INDEX "UQ_ledger_groups_company_code" ON "ledger_groups" ("company_id", "code") WHERE "deleted_at" IS NULL;
      CREATE UNIQUE INDEX "UQ_ledger_groups_company_name" ON "ledger_groups" ("company_id", "name") WHERE "deleted_at" IS NULL;
      CREATE UNIQUE INDEX "UQ_ledgers_company_name" ON "ledgers" ("company_id", "name") WHERE "deleted_at" IS NULL;
      CREATE UNIQUE INDEX "UQ_ledgers_company_code" ON "ledgers" ("company_id", "code") WHERE "deleted_at" IS NULL AND "code" IS NOT NULL;
      CREATE UNIQUE INDEX "UQ_voucher_types_company_code" ON "voucher_types" ("company_id", "code") WHERE "deleted_at" IS NULL;
      -- One ledger per party: the party's account, not several.
      CREATE UNIQUE INDEX "UQ_ledgers_party" ON "ledgers" ("party_id") WHERE "deleted_at" IS NULL AND "party_id" IS NOT NULL;

      CREATE INDEX "IDX_ledger_groups_company" ON "ledger_groups" ("company_id");
      CREATE INDEX "IDX_ledger_groups_parent" ON "ledger_groups" ("parent_id");
      CREATE INDEX "IDX_ledgers_company" ON "ledgers" ("company_id");
      CREATE INDEX "IDX_ledgers_group" ON "ledgers" ("group_id");
      CREATE INDEX "IDX_voucher_types_company" ON "voucher_types" ("company_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "voucher_types";
      DROP TABLE "ledgers";
      DROP TABLE "ledger_groups";
    `);
  }
}
