import { MigrationInterface, QueryRunner } from 'typeorm';

export class InventoryMasters1791532862193 implements MigrationInterface {
  name = 'InventoryMasters1791532862193';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "vouchers" DROP CONSTRAINT "FK_vouchers_reversal_of"`);
    await queryRunner.query(`ALTER TABLE "vouchers" DROP CONSTRAINT "FK_vouchers_site"`);
    await queryRunner.query(`ALTER TABLE "vouchers" DROP CONSTRAINT "FK_vouchers_financial_year"`);
    await queryRunner.query(`ALTER TABLE "vouchers" DROP CONSTRAINT "FK_vouchers_type"`);
    await queryRunner.query(`ALTER TABLE "vouchers" DROP CONSTRAINT "FK_vouchers_company"`);
    await queryRunner.query(`ALTER TABLE "voucher_types" DROP CONSTRAINT "FK_voucher_types_company"`);
    await queryRunner.query(`ALTER TABLE "voucher_sequences" DROP CONSTRAINT "FK_voucher_sequences_type"`);
    await queryRunner.query(`ALTER TABLE "voucher_sequences" DROP CONSTRAINT "FK_voucher_sequences_financial_year"`);
    await queryRunner.query(`ALTER TABLE "voucher_sequences" DROP CONSTRAINT "FK_voucher_sequences_company"`);
    await queryRunner.query(`ALTER TABLE "voucher_lines" DROP CONSTRAINT "FK_voucher_lines_site"`);
    await queryRunner.query(`ALTER TABLE "voucher_lines" DROP CONSTRAINT "FK_voucher_lines_ledger"`);
    await queryRunner.query(`ALTER TABLE "voucher_lines" DROP CONSTRAINT "FK_voucher_lines_voucher"`);
    await queryRunner.query(`ALTER TABLE "voucher_lines" DROP CONSTRAINT "FK_voucher_lines_company"`);
    await queryRunner.query(`ALTER TABLE "ledgers" DROP CONSTRAINT "FK_ledgers_financial_year"`);
    await queryRunner.query(`ALTER TABLE "ledgers" DROP CONSTRAINT "FK_ledgers_group"`);
    await queryRunner.query(`ALTER TABLE "ledgers" DROP CONSTRAINT "FK_ledgers_company"`);
    await queryRunner.query(`ALTER TABLE "ledger_groups" DROP CONSTRAINT "FK_ledger_groups_parent"`);
    await queryRunner.query(`ALTER TABLE "ledger_groups" DROP CONSTRAINT "FK_ledger_groups_company"`);
    await queryRunner.query(`ALTER TABLE "parties" DROP CONSTRAINT "fk_parties_ledger"`);
    await queryRunner.query(`ALTER TABLE "parties" DROP CONSTRAINT "fk_parties_company"`);
    await queryRunner.query(`ALTER TABLE "sites" DROP CONSTRAINT "FK_sites_company"`);
    await queryRunner.query(`ALTER TABLE "financial_years" DROP CONSTRAINT "FK_financial_years_company"`);
    await queryRunner.query(`ALTER TABLE "user_companies" DROP CONSTRAINT "FK_user_companies_role"`);
    await queryRunner.query(`ALTER TABLE "user_companies" DROP CONSTRAINT "FK_user_companies_company"`);
    await queryRunner.query(`ALTER TABLE "user_companies" DROP CONSTRAINT "FK_user_companies_user"`);
    await queryRunner.query(`ALTER TABLE "user_sites" DROP CONSTRAINT "FK_user_sites_site"`);
    await queryRunner.query(`ALTER TABLE "user_sites" DROP CONSTRAINT "FK_user_sites_user"`);
    await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_role_permissions_permission"`);
    await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_role_permissions_role"`);
    await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_refresh_tokens_user"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_vouchers_company_number"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_vouchers_reversal_of"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_vouchers_company_date"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_vouchers_financial_year"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_vouchers_type"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_vouchers_source"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_voucher_types_company_code"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_voucher_types_company"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_voucher_sequences_scope"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_voucher_lines_ledger"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_voucher_lines_voucher"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_voucher_lines_party"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_voucher_lines_site"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_ledgers_company_name"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_ledgers_company_code"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_ledgers_party"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ledgers_company"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ledgers_group"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_ledger_groups_company_code"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_ledger_groups_company_name"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ledger_groups_company"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ledger_groups_parent"`);
    await queryRunner.query(`DROP INDEX "public"."idx_parties_company_id"`);
    await queryRunner.query(`DROP INDEX "public"."uq_parties_ledger_id"`);
    await queryRunner.query(`DROP INDEX "public"."uq_parties_company_name"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_sites_company_code"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_sites_company"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_financial_years_company"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_financial_years_one_active"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_user_companies_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_user_companies_company"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_user_sites_user"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_roles_code_company"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_role_permissions_role"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_refresh_tokens_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_refresh_tokens_expires_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_company_created"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_entity"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_user"`);
    await queryRunner.query(`ALTER TABLE "vouchers" DROP CONSTRAINT "CK_vouchers_status"`);
    await queryRunner.query(`ALTER TABLE "voucher_sequences" DROP CONSTRAINT "CK_voucher_sequences_not_negative"`);
    await queryRunner.query(`ALTER TABLE "voucher_lines" DROP CONSTRAINT "CK_voucher_lines_not_negative"`);
    await queryRunner.query(`ALTER TABLE "voucher_lines" DROP CONSTRAINT "CK_voucher_lines_one_side"`);
    await queryRunner.query(`ALTER TABLE "ledgers" DROP CONSTRAINT "CK_ledgers_opening_not_negative"`);
    await queryRunner.query(`ALTER TABLE "ledgers" DROP CONSTRAINT "CK_ledgers_opening_one_side"`);
    await queryRunner.query(`ALTER TABLE "ledger_groups" DROP CONSTRAINT "CK_ledger_groups_nature"`);
    await queryRunner.query(`ALTER TABLE "parties" DROP CONSTRAINT "chk_parties_opening_one_side"`);
    await queryRunner.query(`ALTER TABLE "parties" DROP CONSTRAINT "chk_parties_opening_non_negative"`);
    await queryRunner.query(`ALTER TABLE "companies" DROP CONSTRAINT "chk_companies_gst_scheme"`);
    await queryRunner.query(`ALTER TABLE "user_companies" DROP CONSTRAINT "UQ_user_companies_user_company"`);
    await queryRunner.query(`ALTER TABLE "user_sites" DROP CONSTRAINT "UQ_user_sites_user_site"`);
    await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "UQ_role_permissions_role_permission"`);
    await queryRunner.query(
      `CREATE TABLE "warehouses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_by" uuid, "company_id" uuid NOT NULL, "deleted_at" TIMESTAMP WITH TIME ZONE, "site_id" uuid NOT NULL, "name" character varying(150) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_56ae21ee2432b2270b48867e4be" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "units" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_by" uuid, "company_id" uuid NOT NULL, "deleted_at" TIMESTAMP WITH TIME ZONE, "name" character varying(50) NOT NULL, "abbreviation" character varying(20) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_5a8f2f064919b587d93936cb223" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_by" uuid, "company_id" uuid NOT NULL, "deleted_at" TIMESTAMP WITH TIME ZONE, "name" character varying(150) NOT NULL, "category" character varying(50) NOT NULL, "unit_id" uuid NOT NULL, "hsn_id" uuid, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_ba5885359424c15ca6b9e79bcf6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "brick_types" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_by" uuid, "company_id" uuid NOT NULL, "deleted_at" TIMESTAMP WITH TIME ZONE, "grade" character varying(50) NOT NULL, "description" text, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_26398db33358cbf8cd373e4afa7" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "brick_types"`);
    await queryRunner.query(`DROP TABLE "items"`);
    await queryRunner.query(`DROP TABLE "units"`);
    await queryRunner.query(`DROP TABLE "warehouses"`);
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "UQ_role_permissions_role_permission" UNIQUE ("role_id", "permission_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sites" ADD CONSTRAINT "UQ_user_sites_user_site" UNIQUE ("user_id", "site_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_companies" ADD CONSTRAINT "UQ_user_companies_user_company" UNIQUE ("user_id", "company_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "companies" ADD CONSTRAINT "chk_companies_gst_scheme" CHECK (((gst_scheme)::text = ANY ((ARRAY['regular_12_itc'::character varying, 'composition_6_no_itc'::character varying])::text[])))`,
    );
    await queryRunner.query(
      `ALTER TABLE "parties" ADD CONSTRAINT "chk_parties_opening_non_negative" CHECK (((opening_debit >= (0)::numeric) AND (opening_credit >= (0)::numeric)))`,
    );
    await queryRunner.query(
      `ALTER TABLE "parties" ADD CONSTRAINT "chk_parties_opening_one_side" CHECK (((opening_debit = (0)::numeric) OR (opening_credit = (0)::numeric)))`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_groups" ADD CONSTRAINT "CK_ledger_groups_nature" CHECK (((nature)::text = ANY ((ARRAY['asset'::character varying, 'liability'::character varying, 'income'::character varying, 'expense'::character varying])::text[])))`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledgers" ADD CONSTRAINT "CK_ledgers_opening_one_side" CHECK (((opening_debit = (0)::numeric) OR (opening_credit = (0)::numeric)))`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledgers" ADD CONSTRAINT "CK_ledgers_opening_not_negative" CHECK (((opening_debit >= (0)::numeric) AND (opening_credit >= (0)::numeric)))`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_lines" ADD CONSTRAINT "CK_voucher_lines_one_side" CHECK ((((debit > (0)::numeric) AND (credit = (0)::numeric)) OR ((credit > (0)::numeric) AND (debit = (0)::numeric))))`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_lines" ADD CONSTRAINT "CK_voucher_lines_not_negative" CHECK (((debit >= (0)::numeric) AND (credit >= (0)::numeric)))`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_sequences" ADD CONSTRAINT "CK_voucher_sequences_not_negative" CHECK ((last_number >= 0))`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "CK_vouchers_status" CHECK (((status)::text = ANY ((ARRAY['posted'::character varying, 'reversed'::character varying])::text[])))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_user" ON "audit_logs" ("user_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_entity" ON "audit_logs" ("entity_name", "entity_id") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_company_created" ON "audit_logs" ("company_id", "created_at") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_refresh_tokens_expires_at" ON "refresh_tokens" ("expires_at") `);
    await queryRunner.query(`CREATE INDEX "IDX_refresh_tokens_user" ON "refresh_tokens" ("user_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_role_permissions_role" ON "role_permissions" ("role_id") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_roles_code_company" ON "roles" ("code", "company_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_user_sites_user" ON "user_sites" ("user_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_user_companies_company" ON "user_companies" ("company_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_user_companies_user" ON "user_companies" ("user_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_financial_years_one_active" ON "financial_years" ("company_id") WHERE ((is_active = true) AND (deleted_at IS NULL))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_financial_years_company" ON "financial_years" ("company_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_sites_company" ON "sites" ("company_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_sites_company_code" ON "sites" ("company_id", "code") WHERE (deleted_at IS NULL)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_parties_company_name" ON "parties" ("company_id") WHERE (deleted_at IS NULL)`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_parties_ledger_id" ON "parties" ("ledger_id") `);
    await queryRunner.query(`CREATE INDEX "idx_parties_company_id" ON "parties" ("company_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_ledger_groups_parent" ON "ledger_groups" ("parent_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_ledger_groups_company" ON "ledger_groups" ("company_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_ledger_groups_company_name" ON "ledger_groups" ("company_id", "name") WHERE (deleted_at IS NULL)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_ledger_groups_company_code" ON "ledger_groups" ("company_id", "code") WHERE (deleted_at IS NULL)`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_ledgers_group" ON "ledgers" ("group_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_ledgers_company" ON "ledgers" ("company_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_ledgers_party" ON "ledgers" ("party_id") WHERE ((deleted_at IS NULL) AND (party_id IS NOT NULL))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_ledgers_company_code" ON "ledgers" ("company_id", "code") WHERE ((deleted_at IS NULL) AND (code IS NOT NULL))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_ledgers_company_name" ON "ledgers" ("company_id", "name") WHERE (deleted_at IS NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_voucher_lines_site" ON "voucher_lines" ("site_id") WHERE (site_id IS NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_voucher_lines_party" ON "voucher_lines" ("party_id") WHERE (party_id IS NOT NULL)`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_voucher_lines_voucher" ON "voucher_lines" ("voucher_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_voucher_lines_ledger" ON "voucher_lines" ("ledger_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_voucher_sequences_scope" ON "voucher_sequences" ("company_id", "financial_year_id", "voucher_type_id") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_voucher_types_company" ON "voucher_types" ("company_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_voucher_types_company_code" ON "voucher_types" ("company_id", "code") WHERE (deleted_at IS NULL)`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_vouchers_source" ON "vouchers" ("source_type", "source_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_vouchers_type" ON "vouchers" ("voucher_type_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_vouchers_financial_year" ON "vouchers" ("financial_year_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_vouchers_company_date" ON "vouchers" ("company_id", "voucher_date") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_vouchers_reversal_of" ON "vouchers" ("reversal_of_id") WHERE (reversal_of_id IS NOT NULL)`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_vouchers_company_number" ON "vouchers" ("company_id", "number") `);
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_role_permissions_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_role_permissions_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sites" ADD CONSTRAINT "FK_user_sites_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sites" ADD CONSTRAINT "FK_user_sites_site" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_companies" ADD CONSTRAINT "FK_user_companies_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_companies" ADD CONSTRAINT "FK_user_companies_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_companies" ADD CONSTRAINT "FK_user_companies_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "financial_years" ADD CONSTRAINT "FK_financial_years_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sites" ADD CONSTRAINT "FK_sites_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "parties" ADD CONSTRAINT "fk_parties_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "parties" ADD CONSTRAINT "fk_parties_ledger" FOREIGN KEY ("ledger_id") REFERENCES "ledgers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_groups" ADD CONSTRAINT "FK_ledger_groups_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_groups" ADD CONSTRAINT "FK_ledger_groups_parent" FOREIGN KEY ("parent_id") REFERENCES "ledger_groups"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledgers" ADD CONSTRAINT "FK_ledgers_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledgers" ADD CONSTRAINT "FK_ledgers_group" FOREIGN KEY ("group_id") REFERENCES "ledger_groups"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledgers" ADD CONSTRAINT "FK_ledgers_financial_year" FOREIGN KEY ("opening_financial_year_id") REFERENCES "financial_years"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_lines" ADD CONSTRAINT "FK_voucher_lines_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_lines" ADD CONSTRAINT "FK_voucher_lines_voucher" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_lines" ADD CONSTRAINT "FK_voucher_lines_ledger" FOREIGN KEY ("ledger_id") REFERENCES "ledgers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_lines" ADD CONSTRAINT "FK_voucher_lines_site" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_sequences" ADD CONSTRAINT "FK_voucher_sequences_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_sequences" ADD CONSTRAINT "FK_voucher_sequences_financial_year" FOREIGN KEY ("financial_year_id") REFERENCES "financial_years"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_sequences" ADD CONSTRAINT "FK_voucher_sequences_type" FOREIGN KEY ("voucher_type_id") REFERENCES "voucher_types"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_types" ADD CONSTRAINT "FK_voucher_types_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "FK_vouchers_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "FK_vouchers_type" FOREIGN KEY ("voucher_type_id") REFERENCES "voucher_types"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "FK_vouchers_financial_year" FOREIGN KEY ("financial_year_id") REFERENCES "financial_years"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "FK_vouchers_site" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "FK_vouchers_reversal_of" FOREIGN KEY ("reversal_of_id") REFERENCES "vouchers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }
}
