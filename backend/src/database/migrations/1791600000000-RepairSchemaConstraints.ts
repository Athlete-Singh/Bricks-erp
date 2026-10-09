import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Repairs the schema damage done by `1791532862193-InventoryMasters`, and gives
 * the P3 master tables the constraints every other tenant table already has.
 *
 * That migration was produced by `typeorm migration:generate`. The entity
 * classes never declared the indexes and foreign keys, which earlier migrations
 * had written by hand — so the generator read them as drift and emitted 82
 * DROP statements in `up()` with the matching CREATEs in `down()`. Running it
 * forward therefore *removed* the database's integrity guarantees: unique
 * voucher numbers (GST invoice numbering), one active financial year, one
 * ledger per party, unique ledger names, and roughly thirty foreign keys.
 * Application code still enforced all of it, so no test failed.
 *
 * Every statement here is idempotent, so this repairs a database that already
 * ran the bad migration and is a no-op on one that somehow did not.
 *
 * Two corrections to note:
 *  - `uq_parties_company_name` is restored as `(company_id, lower(name))`. The
 *    generated `down()` rendered it as `(company_id)` alone, because TypeORM
 *    cannot express an index over an expression; applying that version would
 *    have limited each company to a single party.
 *  - `effective_from` is added to the rate tables, which ADR-018 requires and
 *    P3.1c omitted.
 */
export class RepairSchemaConstraints1791600000000 implements MigrationInterface {
  name = 'RepairSchemaConstraints1791600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 0. Clear rows orphaned while the foreign keys were missing ───────────
    // These accumulated precisely because the keys were dropped: a row whose
    // parent no longer exists is unreachable by every query in the app, so it
    // is garbage, not data. Without this the ADDs below fail on the first one.
    await queryRunner.query(
      `DELETE FROM "refresh_tokens" WHERE "user_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "users" WHERE "users"."id" = "refresh_tokens"."user_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "role_permissions" WHERE "role_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "roles" WHERE "roles"."id" = "role_permissions"."role_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "role_permissions" WHERE "permission_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "permissions" WHERE "permissions"."id" = "role_permissions"."permission_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "user_sites" WHERE "user_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "users" WHERE "users"."id" = "user_sites"."user_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "user_sites" WHERE "site_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "sites" WHERE "sites"."id" = "user_sites"."site_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "user_companies" WHERE "user_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "users" WHERE "users"."id" = "user_companies"."user_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "user_companies" WHERE "company_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "companies" WHERE "companies"."id" = "user_companies"."company_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "user_companies" WHERE "role_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "roles" WHERE "roles"."id" = "user_companies"."role_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "financial_years" WHERE "company_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "companies" WHERE "companies"."id" = "financial_years"."company_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "sites" WHERE "company_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "companies" WHERE "companies"."id" = "sites"."company_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "parties" WHERE "company_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "companies" WHERE "companies"."id" = "parties"."company_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "parties" WHERE "ledger_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "ledgers" WHERE "ledgers"."id" = "parties"."ledger_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "ledger_groups" WHERE "company_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "companies" WHERE "companies"."id" = "ledger_groups"."company_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "ledger_groups" WHERE "parent_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "ledger_groups" WHERE "ledger_groups"."id" = "ledger_groups"."parent_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "ledgers" WHERE "company_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "companies" WHERE "companies"."id" = "ledgers"."company_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "ledgers" WHERE "group_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "ledger_groups" WHERE "ledger_groups"."id" = "ledgers"."group_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "ledgers" WHERE "opening_financial_year_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "financial_years" WHERE "financial_years"."id" = "ledgers"."opening_financial_year_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "voucher_lines" WHERE "company_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "companies" WHERE "companies"."id" = "voucher_lines"."company_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "voucher_lines" WHERE "voucher_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "vouchers" WHERE "vouchers"."id" = "voucher_lines"."voucher_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "voucher_lines" WHERE "ledger_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "ledgers" WHERE "ledgers"."id" = "voucher_lines"."ledger_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "voucher_lines" WHERE "site_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "sites" WHERE "sites"."id" = "voucher_lines"."site_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "voucher_sequences" WHERE "company_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "companies" WHERE "companies"."id" = "voucher_sequences"."company_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "voucher_sequences" WHERE "financial_year_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "financial_years" WHERE "financial_years"."id" = "voucher_sequences"."financial_year_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "voucher_sequences" WHERE "voucher_type_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "voucher_types" WHERE "voucher_types"."id" = "voucher_sequences"."voucher_type_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "voucher_types" WHERE "company_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "companies" WHERE "companies"."id" = "voucher_types"."company_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "vouchers" WHERE "company_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "companies" WHERE "companies"."id" = "vouchers"."company_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "vouchers" WHERE "voucher_type_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "voucher_types" WHERE "voucher_types"."id" = "vouchers"."voucher_type_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "vouchers" WHERE "financial_year_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "financial_years" WHERE "financial_years"."id" = "vouchers"."financial_year_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "vouchers" WHERE "site_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "sites" WHERE "sites"."id" = "vouchers"."site_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "vouchers" WHERE "reversal_of_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "vouchers" WHERE "vouchers"."id" = "vouchers"."reversal_of_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "items" WHERE "unit_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "units" WHERE "units"."id" = "items"."unit_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "items" WHERE "hsn_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "tax_hsn_rates" WHERE "tax_hsn_rates"."id" = "items"."hsn_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "warehouses" WHERE "site_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "sites" WHERE "sites"."id" = "warehouses"."site_id")`,
    );
    await queryRunner.query(
      `DELETE FROM "transport_vehicles" WHERE "party_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "parties" WHERE "parties"."id" = "transport_vehicles"."party_id")`,
    );

    // ── 1. Restore what the generated migration dropped ──────────────────────
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "UQ_role_permissions_role_permission"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "UQ_role_permissions_role_permission" UNIQUE ("role_id", "permission_id")`,
    );
    await queryRunner.query(`ALTER TABLE "user_sites" DROP CONSTRAINT IF EXISTS "UQ_user_sites_user_site"`);
    await queryRunner.query(
      `ALTER TABLE "user_sites" ADD CONSTRAINT "UQ_user_sites_user_site" UNIQUE ("user_id", "site_id")`,
    );
    await queryRunner.query(`ALTER TABLE "user_companies" DROP CONSTRAINT IF EXISTS "UQ_user_companies_user_company"`);
    await queryRunner.query(
      `ALTER TABLE "user_companies" ADD CONSTRAINT "UQ_user_companies_user_company" UNIQUE ("user_id", "company_id")`,
    );
    await queryRunner.query(`ALTER TABLE "companies" DROP CONSTRAINT IF EXISTS "chk_companies_gst_scheme"`);
    await queryRunner.query(
      `ALTER TABLE "companies" ADD CONSTRAINT "chk_companies_gst_scheme" CHECK (((gst_scheme)::text = ANY ((ARRAY['regular_12_itc'::character varying, 'composition_6_no_itc'::character varying])::text[])))`,
    );
    await queryRunner.query(`ALTER TABLE "parties" DROP CONSTRAINT IF EXISTS "chk_parties_opening_non_negative"`);
    await queryRunner.query(
      `ALTER TABLE "parties" ADD CONSTRAINT "chk_parties_opening_non_negative" CHECK (((opening_debit >= (0)::numeric) AND (opening_credit >= (0)::numeric)))`,
    );
    await queryRunner.query(`ALTER TABLE "parties" DROP CONSTRAINT IF EXISTS "chk_parties_opening_one_side"`);
    await queryRunner.query(
      `ALTER TABLE "parties" ADD CONSTRAINT "chk_parties_opening_one_side" CHECK (((opening_debit = (0)::numeric) OR (opening_credit = (0)::numeric)))`,
    );
    await queryRunner.query(`ALTER TABLE "ledger_groups" DROP CONSTRAINT IF EXISTS "CK_ledger_groups_nature"`);
    await queryRunner.query(
      `ALTER TABLE "ledger_groups" ADD CONSTRAINT "CK_ledger_groups_nature" CHECK (((nature)::text = ANY ((ARRAY['asset'::character varying, 'liability'::character varying, 'income'::character varying, 'expense'::character varying])::text[])))`,
    );
    await queryRunner.query(`ALTER TABLE "ledgers" DROP CONSTRAINT IF EXISTS "CK_ledgers_opening_one_side"`);
    await queryRunner.query(
      `ALTER TABLE "ledgers" ADD CONSTRAINT "CK_ledgers_opening_one_side" CHECK (((opening_debit = (0)::numeric) OR (opening_credit = (0)::numeric)))`,
    );
    await queryRunner.query(`ALTER TABLE "ledgers" DROP CONSTRAINT IF EXISTS "CK_ledgers_opening_not_negative"`);
    await queryRunner.query(
      `ALTER TABLE "ledgers" ADD CONSTRAINT "CK_ledgers_opening_not_negative" CHECK (((opening_debit >= (0)::numeric) AND (opening_credit >= (0)::numeric)))`,
    );
    await queryRunner.query(`ALTER TABLE "voucher_lines" DROP CONSTRAINT IF EXISTS "CK_voucher_lines_one_side"`);
    await queryRunner.query(
      `ALTER TABLE "voucher_lines" ADD CONSTRAINT "CK_voucher_lines_one_side" CHECK ((((debit > (0)::numeric) AND (credit = (0)::numeric)) OR ((credit > (0)::numeric) AND (debit = (0)::numeric))))`,
    );
    await queryRunner.query(`ALTER TABLE "voucher_lines" DROP CONSTRAINT IF EXISTS "CK_voucher_lines_not_negative"`);
    await queryRunner.query(
      `ALTER TABLE "voucher_lines" ADD CONSTRAINT "CK_voucher_lines_not_negative" CHECK (((debit >= (0)::numeric) AND (credit >= (0)::numeric)))`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_sequences" DROP CONSTRAINT IF EXISTS "CK_voucher_sequences_not_negative"`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_sequences" ADD CONSTRAINT "CK_voucher_sequences_not_negative" CHECK ((last_number >= 0))`,
    );
    await queryRunner.query(`ALTER TABLE "vouchers" DROP CONSTRAINT IF EXISTS "CK_vouchers_status"`);
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "CK_vouchers_status" CHECK (((status)::text = ANY ((ARRAY['posted'::character varying, 'reversed'::character varying])::text[])))`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_audit_logs_user"`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_user" ON "audit_logs" ("user_id")`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_audit_logs_entity"`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_entity" ON "audit_logs" ("entity_name", "entity_id")`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_audit_logs_company_created"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_company_created" ON "audit_logs" ("company_id", "created_at")`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_refresh_tokens_expires_at"`);
    await queryRunner.query(`CREATE INDEX "IDX_refresh_tokens_expires_at" ON "refresh_tokens" ("expires_at")`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_refresh_tokens_user"`);
    await queryRunner.query(`CREATE INDEX "IDX_refresh_tokens_user" ON "refresh_tokens" ("user_id")`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_role_permissions_role"`);
    await queryRunner.query(`CREATE INDEX "IDX_role_permissions_role" ON "role_permissions" ("role_id")`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_roles_code_company"`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_roles_code_company" ON "roles" ("code", "company_id")`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_user_sites_user"`);
    await queryRunner.query(`CREATE INDEX "IDX_user_sites_user" ON "user_sites" ("user_id")`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_user_companies_company"`);
    await queryRunner.query(`CREATE INDEX "IDX_user_companies_company" ON "user_companies" ("company_id")`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_user_companies_user"`);
    await queryRunner.query(`CREATE INDEX "IDX_user_companies_user" ON "user_companies" ("user_id")`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_financial_years_one_active"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_financial_years_one_active" ON "financial_years" ("company_id") WHERE ((is_active = true) AND (deleted_at IS NULL))`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_financial_years_company"`);
    await queryRunner.query(`CREATE INDEX "IDX_financial_years_company" ON "financial_years" ("company_id")`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_sites_company"`);
    await queryRunner.query(`CREATE INDEX "IDX_sites_company" ON "sites" ("company_id")`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_sites_company_code"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_sites_company_code" ON "sites" ("company_id", "code") WHERE (deleted_at IS NULL)`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."uq_parties_company_name"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_parties_company_name" ON "parties" ("company_id", lower("name")) WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."uq_parties_ledger_id"`);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_parties_ledger_id" ON "parties" ("ledger_id")`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_parties_company_id"`);
    await queryRunner.query(`CREATE INDEX "idx_parties_company_id" ON "parties" ("company_id")`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_ledger_groups_parent"`);
    await queryRunner.query(`CREATE INDEX "IDX_ledger_groups_parent" ON "ledger_groups" ("parent_id")`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_ledger_groups_company"`);
    await queryRunner.query(`CREATE INDEX "IDX_ledger_groups_company" ON "ledger_groups" ("company_id")`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_ledger_groups_company_name"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_ledger_groups_company_name" ON "ledger_groups" ("company_id", "name") WHERE (deleted_at IS NULL)`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_ledger_groups_company_code"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_ledger_groups_company_code" ON "ledger_groups" ("company_id", "code") WHERE (deleted_at IS NULL)`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_ledgers_group"`);
    await queryRunner.query(`CREATE INDEX "IDX_ledgers_group" ON "ledgers" ("group_id")`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_ledgers_company"`);
    await queryRunner.query(`CREATE INDEX "IDX_ledgers_company" ON "ledgers" ("company_id")`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_ledgers_party"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_ledgers_party" ON "ledgers" ("party_id") WHERE ((deleted_at IS NULL) AND (party_id IS NOT NULL))`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_ledgers_company_code"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_ledgers_company_code" ON "ledgers" ("company_id", "code") WHERE ((deleted_at IS NULL) AND (code IS NOT NULL))`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_ledgers_company_name"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_ledgers_company_name" ON "ledgers" ("company_id", "name") WHERE (deleted_at IS NULL)`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_voucher_lines_site"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_voucher_lines_site" ON "voucher_lines" ("site_id") WHERE (site_id IS NOT NULL)`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_voucher_lines_party"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_voucher_lines_party" ON "voucher_lines" ("party_id") WHERE (party_id IS NOT NULL)`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_voucher_lines_voucher"`);
    await queryRunner.query(`CREATE INDEX "IDX_voucher_lines_voucher" ON "voucher_lines" ("voucher_id")`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_voucher_lines_ledger"`);
    await queryRunner.query(`CREATE INDEX "IDX_voucher_lines_ledger" ON "voucher_lines" ("ledger_id")`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_voucher_sequences_scope"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_voucher_sequences_scope" ON "voucher_sequences" ("company_id", "financial_year_id", "voucher_type_id")`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_voucher_types_company"`);
    await queryRunner.query(`CREATE INDEX "IDX_voucher_types_company" ON "voucher_types" ("company_id")`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_voucher_types_company_code"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_voucher_types_company_code" ON "voucher_types" ("company_id", "code") WHERE (deleted_at IS NULL)`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_vouchers_source"`);
    await queryRunner.query(`CREATE INDEX "IDX_vouchers_source" ON "vouchers" ("source_type", "source_id")`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_vouchers_type"`);
    await queryRunner.query(`CREATE INDEX "IDX_vouchers_type" ON "vouchers" ("voucher_type_id")`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_vouchers_financial_year"`);
    await queryRunner.query(`CREATE INDEX "IDX_vouchers_financial_year" ON "vouchers" ("financial_year_id")`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_vouchers_company_date"`);
    await queryRunner.query(`CREATE INDEX "IDX_vouchers_company_date" ON "vouchers" ("company_id", "voucher_date")`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_vouchers_reversal_of"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_vouchers_reversal_of" ON "vouchers" ("reversal_of_id") WHERE (reversal_of_id IS NOT NULL)`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_vouchers_company_number"`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_vouchers_company_number" ON "vouchers" ("company_id", "number")`);
    await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "FK_refresh_tokens_user"`);
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "FK_role_permissions_role"`);
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_role_permissions_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "FK_role_permissions_permission"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_role_permissions_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "user_sites" DROP CONSTRAINT IF EXISTS "FK_user_sites_user"`);
    await queryRunner.query(
      `ALTER TABLE "user_sites" ADD CONSTRAINT "FK_user_sites_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "user_sites" DROP CONSTRAINT IF EXISTS "FK_user_sites_site"`);
    await queryRunner.query(
      `ALTER TABLE "user_sites" ADD CONSTRAINT "FK_user_sites_site" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "user_companies" DROP CONSTRAINT IF EXISTS "FK_user_companies_user"`);
    await queryRunner.query(
      `ALTER TABLE "user_companies" ADD CONSTRAINT "FK_user_companies_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "user_companies" DROP CONSTRAINT IF EXISTS "FK_user_companies_company"`);
    await queryRunner.query(
      `ALTER TABLE "user_companies" ADD CONSTRAINT "FK_user_companies_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "user_companies" DROP CONSTRAINT IF EXISTS "FK_user_companies_role"`);
    await queryRunner.query(
      `ALTER TABLE "user_companies" ADD CONSTRAINT "FK_user_companies_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "financial_years" DROP CONSTRAINT IF EXISTS "FK_financial_years_company"`);
    await queryRunner.query(
      `ALTER TABLE "financial_years" ADD CONSTRAINT "FK_financial_years_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "sites" DROP CONSTRAINT IF EXISTS "FK_sites_company"`);
    await queryRunner.query(
      `ALTER TABLE "sites" ADD CONSTRAINT "FK_sites_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "parties" DROP CONSTRAINT IF EXISTS "fk_parties_company"`);
    await queryRunner.query(
      `ALTER TABLE "parties" ADD CONSTRAINT "fk_parties_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "parties" DROP CONSTRAINT IF EXISTS "fk_parties_ledger"`);
    await queryRunner.query(
      `ALTER TABLE "parties" ADD CONSTRAINT "fk_parties_ledger" FOREIGN KEY ("ledger_id") REFERENCES "ledgers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "ledger_groups" DROP CONSTRAINT IF EXISTS "FK_ledger_groups_company"`);
    await queryRunner.query(
      `ALTER TABLE "ledger_groups" ADD CONSTRAINT "FK_ledger_groups_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "ledger_groups" DROP CONSTRAINT IF EXISTS "FK_ledger_groups_parent"`);
    await queryRunner.query(
      `ALTER TABLE "ledger_groups" ADD CONSTRAINT "FK_ledger_groups_parent" FOREIGN KEY ("parent_id") REFERENCES "ledger_groups"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "ledgers" DROP CONSTRAINT IF EXISTS "FK_ledgers_company"`);
    await queryRunner.query(
      `ALTER TABLE "ledgers" ADD CONSTRAINT "FK_ledgers_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "ledgers" DROP CONSTRAINT IF EXISTS "FK_ledgers_group"`);
    await queryRunner.query(
      `ALTER TABLE "ledgers" ADD CONSTRAINT "FK_ledgers_group" FOREIGN KEY ("group_id") REFERENCES "ledger_groups"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "ledgers" DROP CONSTRAINT IF EXISTS "FK_ledgers_financial_year"`);
    await queryRunner.query(
      `ALTER TABLE "ledgers" ADD CONSTRAINT "FK_ledgers_financial_year" FOREIGN KEY ("opening_financial_year_id") REFERENCES "financial_years"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "voucher_lines" DROP CONSTRAINT IF EXISTS "FK_voucher_lines_company"`);
    await queryRunner.query(
      `ALTER TABLE "voucher_lines" ADD CONSTRAINT "FK_voucher_lines_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "voucher_lines" DROP CONSTRAINT IF EXISTS "FK_voucher_lines_voucher"`);
    await queryRunner.query(
      `ALTER TABLE "voucher_lines" ADD CONSTRAINT "FK_voucher_lines_voucher" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "voucher_lines" DROP CONSTRAINT IF EXISTS "FK_voucher_lines_ledger"`);
    await queryRunner.query(
      `ALTER TABLE "voucher_lines" ADD CONSTRAINT "FK_voucher_lines_ledger" FOREIGN KEY ("ledger_id") REFERENCES "ledgers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "voucher_lines" DROP CONSTRAINT IF EXISTS "FK_voucher_lines_site"`);
    await queryRunner.query(
      `ALTER TABLE "voucher_lines" ADD CONSTRAINT "FK_voucher_lines_site" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "voucher_sequences" DROP CONSTRAINT IF EXISTS "FK_voucher_sequences_company"`);
    await queryRunner.query(
      `ALTER TABLE "voucher_sequences" ADD CONSTRAINT "FK_voucher_sequences_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_sequences" DROP CONSTRAINT IF EXISTS "FK_voucher_sequences_financial_year"`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_sequences" ADD CONSTRAINT "FK_voucher_sequences_financial_year" FOREIGN KEY ("financial_year_id") REFERENCES "financial_years"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "voucher_sequences" DROP CONSTRAINT IF EXISTS "FK_voucher_sequences_type"`);
    await queryRunner.query(
      `ALTER TABLE "voucher_sequences" ADD CONSTRAINT "FK_voucher_sequences_type" FOREIGN KEY ("voucher_type_id") REFERENCES "voucher_types"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "voucher_types" DROP CONSTRAINT IF EXISTS "FK_voucher_types_company"`);
    await queryRunner.query(
      `ALTER TABLE "voucher_types" ADD CONSTRAINT "FK_voucher_types_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "vouchers" DROP CONSTRAINT IF EXISTS "FK_vouchers_company"`);
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "FK_vouchers_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "vouchers" DROP CONSTRAINT IF EXISTS "FK_vouchers_type"`);
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "FK_vouchers_type" FOREIGN KEY ("voucher_type_id") REFERENCES "voucher_types"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "vouchers" DROP CONSTRAINT IF EXISTS "FK_vouchers_financial_year"`);
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "FK_vouchers_financial_year" FOREIGN KEY ("financial_year_id") REFERENCES "financial_years"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "vouchers" DROP CONSTRAINT IF EXISTS "FK_vouchers_site"`);
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "FK_vouchers_site" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "vouchers" DROP CONSTRAINT IF EXISTS "FK_vouchers_reversal_of"`);
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "FK_vouchers_reversal_of" FOREIGN KEY ("reversal_of_id") REFERENCES "vouchers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    // ── 2. Give the P3 master tables the same guarantees ─────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_units_company"`);
    await queryRunner.query(`CREATE INDEX "idx_units_company" ON "units" ("company_id")`);
    await queryRunner.query(`ALTER TABLE "units" DROP CONSTRAINT IF EXISTS "fk_units_company"`);
    await queryRunner.query(
      `ALTER TABLE "units" ADD CONSTRAINT "fk_units_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_items_company"`);
    await queryRunner.query(`CREATE INDEX "idx_items_company" ON "items" ("company_id")`);
    await queryRunner.query(`ALTER TABLE "items" DROP CONSTRAINT IF EXISTS "fk_items_company"`);
    await queryRunner.query(
      `ALTER TABLE "items" ADD CONSTRAINT "fk_items_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_warehouses_company"`);
    await queryRunner.query(`CREATE INDEX "idx_warehouses_company" ON "warehouses" ("company_id")`);
    await queryRunner.query(`ALTER TABLE "warehouses" DROP CONSTRAINT IF EXISTS "fk_warehouses_company"`);
    await queryRunner.query(
      `ALTER TABLE "warehouses" ADD CONSTRAINT "fk_warehouses_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_brick_types_company"`);
    await queryRunner.query(`CREATE INDEX "idx_brick_types_company" ON "brick_types" ("company_id")`);
    await queryRunner.query(`ALTER TABLE "brick_types" DROP CONSTRAINT IF EXISTS "fk_brick_types_company"`);
    await queryRunner.query(
      `ALTER TABLE "brick_types" ADD CONSTRAINT "fk_brick_types_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_transport_drivers_company"`);
    await queryRunner.query(`CREATE INDEX "idx_transport_drivers_company" ON "transport_drivers" ("company_id")`);
    await queryRunner.query(`ALTER TABLE "transport_drivers" DROP CONSTRAINT IF EXISTS "fk_transport_drivers_company"`);
    await queryRunner.query(
      `ALTER TABLE "transport_drivers" ADD CONSTRAINT "fk_transport_drivers_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_transport_vehicles_company"`);
    await queryRunner.query(`CREATE INDEX "idx_transport_vehicles_company" ON "transport_vehicles" ("company_id")`);
    await queryRunner.query(
      `ALTER TABLE "transport_vehicles" DROP CONSTRAINT IF EXISTS "fk_transport_vehicles_company"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transport_vehicles" ADD CONSTRAINT "fk_transport_vehicles_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_tax_hsn_rates_company"`);
    await queryRunner.query(`CREATE INDEX "idx_tax_hsn_rates_company" ON "tax_hsn_rates" ("company_id")`);
    await queryRunner.query(`ALTER TABLE "tax_hsn_rates" DROP CONSTRAINT IF EXISTS "fk_tax_hsn_rates_company"`);
    await queryRunner.query(
      `ALTER TABLE "tax_hsn_rates" ADD CONSTRAINT "fk_tax_hsn_rates_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_labour_wage_rates_company"`);
    await queryRunner.query(`CREATE INDEX "idx_labour_wage_rates_company" ON "labour_wage_rates" ("company_id")`);
    await queryRunner.query(`ALTER TABLE "labour_wage_rates" DROP CONSTRAINT IF EXISTS "fk_labour_wage_rates_company"`);
    await queryRunner.query(
      `ALTER TABLE "labour_wage_rates" ADD CONSTRAINT "fk_labour_wage_rates_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."uq_units_company_name"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_units_company_name" ON "units" ("company_id", lower("name")) WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."uq_units_company_abbrev"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_units_company_abbrev" ON "units" ("company_id", lower("abbreviation")) WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."uq_items_company_name"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_items_company_name" ON "items" ("company_id", lower("name")) WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."uq_brick_types_company_grade"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_brick_types_company_grade" ON "brick_types" ("company_id", lower("grade")) WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."uq_warehouses_site_name"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_warehouses_site_name" ON "warehouses" ("site_id", lower("name")) WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."uq_transport_drivers_company_name"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_transport_drivers_company_name" ON "transport_drivers" ("company_id", lower("name")) WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."uq_transport_vehicles_company_reg"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_transport_vehicles_company_reg" ON "transport_vehicles" ("company_id", upper("registration_no")) WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."uq_tax_hsn_rates_company_code"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_tax_hsn_rates_company_code" ON "tax_hsn_rates" ("company_id", "hsn_code") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."uq_labour_wage_rates_company_activity"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_labour_wage_rates_company_activity" ON "labour_wage_rates" ("company_id", "activity", lower("unit")) WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(`ALTER TABLE "items" DROP CONSTRAINT IF EXISTS "fk_items_unit_id"`);
    await queryRunner.query(
      `ALTER TABLE "items" ADD CONSTRAINT "fk_items_unit_id" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT`,
    );
    await queryRunner.query(`ALTER TABLE "items" DROP CONSTRAINT IF EXISTS "fk_items_hsn_id"`);
    await queryRunner.query(
      `ALTER TABLE "items" ADD CONSTRAINT "fk_items_hsn_id" FOREIGN KEY ("hsn_id") REFERENCES "tax_hsn_rates"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(`ALTER TABLE "warehouses" DROP CONSTRAINT IF EXISTS "fk_warehouses_site_id"`);
    await queryRunner.query(
      `ALTER TABLE "warehouses" ADD CONSTRAINT "fk_warehouses_site_id" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT`,
    );
    await queryRunner.query(
      `ALTER TABLE "transport_vehicles" DROP CONSTRAINT IF EXISTS "fk_transport_vehicles_party_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transport_vehicles" ADD CONSTRAINT "fk_transport_vehicles_party_id" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE SET NULL`,
    );

    // ── 3. ADR-018: rates are dated, so old invoices keep their old rate ─────
    await queryRunner.query(
      `ALTER TABLE "tax_hsn_rates" ADD COLUMN IF NOT EXISTS "effective_from" date NOT NULL DEFAULT CURRENT_DATE`,
    );
    await queryRunner.query(
      `ALTER TABLE "labour_wage_rates" ADD COLUMN IF NOT EXISTS "effective_from" date NOT NULL DEFAULT CURRENT_DATE`,
    );
  }

  public async down(): Promise<void> {
    // Deliberately empty. This migration only restores constraints that should
    // never have been dropped; reversing it would reintroduce the defect.
  }
}
