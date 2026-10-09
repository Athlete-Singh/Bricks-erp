import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Parties1700000400000 implements MigrationInterface {
  name = 'Parties1700000400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ADR-019: GST scheme on the company
    await queryRunner.query(`
      ALTER TABLE "companies"
      ADD COLUMN "gst_scheme" varchar(30) NOT NULL DEFAULT 'regular_12_itc'
    `);
    await queryRunner.query(`
      ALTER TABLE "companies"
      ADD CONSTRAINT "chk_companies_gst_scheme"
      CHECK ("gst_scheme" IN ('regular_12_itc', 'composition_6_no_itc'))
    `);

    // PTY-01/02/03: the party master
    await queryRunner.query(`
      CREATE TABLE "parties" (
        "id"              uuid DEFAULT gen_random_uuid() NOT NULL,
        "company_id"      uuid NOT NULL,
        "name"            varchar(200) NOT NULL,
        "party_types"     text[] NOT NULL,
        "gstin"           varchar(15),
        "pan"             varchar(10),
        "state_code"      varchar(2),
        "address"         text,
        "phone"           varchar(20),
        "email"           varchar(255),
        "opening_debit"   numeric(18,2) NOT NULL DEFAULT 0,
        "opening_credit"  numeric(18,2) NOT NULL DEFAULT 0,
        "ledger_id"       uuid NOT NULL,
        "is_active"       boolean NOT NULL DEFAULT true,
        "created_at"      timestamptz NOT NULL DEFAULT now(),
        "updated_at"      timestamptz NOT NULL DEFAULT now(),
        "created_by"      uuid,
        "updated_by"      uuid,
        "deleted_at"      timestamptz,
        CONSTRAINT "pk_parties" PRIMARY KEY ("id")
      )
    `);

    // Tenant scope — every query filters on this
    await queryRunner.query(`CREATE INDEX "idx_parties_company_id" ON "parties" ("company_id")`);

    // One ledger per party (mirrors the unique index on ledgers.party_id)
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_parties_ledger_id" ON "parties" ("ledger_id")`);

    // Unique name per company among live (non-deleted) rows
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_parties_company_name"
      ON "parties" ("company_id", lower("name"))
      WHERE "deleted_at" IS NULL
    `);

    // Opening balance on one side only, same rule as ledgers
    await queryRunner.query(`
      ALTER TABLE "parties"
      ADD CONSTRAINT "chk_parties_opening_one_side"
      CHECK ("opening_debit" = 0 OR "opening_credit" = 0)
    `);

    await queryRunner.query(`
      ALTER TABLE "parties"
      ADD CONSTRAINT "chk_parties_opening_non_negative"
      CHECK ("opening_debit" >= 0 AND "opening_credit" >= 0)
    `);

    // FKs
    await queryRunner.query(`
      ALTER TABLE "parties"
      ADD CONSTRAINT "fk_parties_company"
      FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "parties"
      ADD CONSTRAINT "fk_parties_ledger"
      FOREIGN KEY ("ledger_id") REFERENCES "ledgers" ("id") ON DELETE RESTRICT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "parties"`);
    await queryRunner.query(`ALTER TABLE "companies" DROP CONSTRAINT "chk_companies_gst_scheme"`);
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "gst_scheme"`);
  }
}
