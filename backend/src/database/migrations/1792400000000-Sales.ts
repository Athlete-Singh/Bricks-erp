import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P8 — the sales engine (SAL-01…07). Hand-written, never generated.
 *
 * Twelve tables. The CHECK constraints carry rules the service also enforces,
 * because a rule living only in TypeScript is one bad migration from gone —
 * notably that an invoice's total really is the sum of its parts, that an
 * invoice cannot be paid more than it is worth, and that a line carries
 * either CGST + SGST or IGST but never both (same shape as purchase_bills).
 */
export class Sales1792400000000 implements MigrationInterface {
  name = 'Sales1792400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── quotations ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "quotations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "quote_no" varchar(30) NOT NULL,
        "customer_party_id" uuid NOT NULL,
        "site_id" uuid NOT NULL,
        "quote_date" date NOT NULL,
        "valid_until" date,
        "status" varchar(20) NOT NULL DEFAULT 'draft',
        "taxable_amount" numeric(18,2) NOT NULL,
        "cgst_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "sgst_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "igst_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "total_amount" numeric(18,2) NOT NULL,
        "notes" text,
        CONSTRAINT "pk_quotations" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "quotation_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "quotation_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "quantity" numeric(18,3) NOT NULL,
        "rate" numeric(18,2) NOT NULL,
        "discount" numeric(18,2) NOT NULL DEFAULT 0,
        "taxable_amount" numeric(18,2) NOT NULL,
        "cgst_rate" numeric(5,2) NOT NULL DEFAULT 0,
        "sgst_rate" numeric(5,2) NOT NULL DEFAULT 0,
        "igst_rate" numeric(5,2) NOT NULL DEFAULT 0,
        "cgst_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "sgst_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "igst_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "description" text,
        CONSTRAINT "pk_quotation_lines" PRIMARY KEY ("id")
      )
    `);
    // ── sales_orders ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "sales_orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "order_no" varchar(30) NOT NULL,
        "customer_party_id" uuid NOT NULL,
        "site_id" uuid NOT NULL,
        "quotation_id" uuid,
        "order_date" date NOT NULL,
        "expected_date" date,
        "status" varchar(20) NOT NULL DEFAULT 'open',
        "taxable_amount" numeric(18,2) NOT NULL,
        "cgst_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "sgst_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "igst_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "total_amount" numeric(18,2) NOT NULL,
        "notes" text,
        CONSTRAINT "pk_sales_orders" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "sales_order_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "sales_order_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "quantity" numeric(18,3) NOT NULL,
        "rate" numeric(18,2) NOT NULL,
        "discount" numeric(18,2) NOT NULL DEFAULT 0,
        "taxable_amount" numeric(18,2) NOT NULL,
        "cgst_rate" numeric(5,2) NOT NULL DEFAULT 0,
        "sgst_rate" numeric(5,2) NOT NULL DEFAULT 0,
        "igst_rate" numeric(5,2) NOT NULL DEFAULT 0,
        "cgst_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "sgst_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "igst_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "invoiced_quantity" numeric(18,3) NOT NULL DEFAULT 0,
        "description" text,
        CONSTRAINT "pk_sales_order_lines" PRIMARY KEY ("id")
      )
    `);
    // ── sales_invoices ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "sales_invoices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "invoice_no" varchar(30) NOT NULL,
        "customer_party_id" uuid NOT NULL,
        "site_id" uuid NOT NULL,
        "sales_order_id" uuid,
        "invoice_date" date NOT NULL,
        "due_date" date,
        "customer_po_no" varchar(50),
        "taxable_amount" numeric(18,2) NOT NULL,
        "cgst_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "sgst_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "igst_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "total_amount" numeric(18,2) NOT NULL,
        "paid_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "status" varchar(20) NOT NULL DEFAULT 'open',
        "voucher_id" uuid NOT NULL,
        "notes" text,
        CONSTRAINT "pk_sales_invoices" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "sales_invoice_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "sales_invoice_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "warehouse_id" uuid NOT NULL,
        "quantity" numeric(18,3) NOT NULL,
        "rate" numeric(18,2) NOT NULL,
        "discount" numeric(18,2) NOT NULL DEFAULT 0,
        "taxable_amount" numeric(18,2) NOT NULL,
        "cgst_rate" numeric(5,2) NOT NULL DEFAULT 0,
        "sgst_rate" numeric(5,2) NOT NULL DEFAULT 0,
        "igst_rate" numeric(5,2) NOT NULL DEFAULT 0,
        "cgst_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "sgst_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "igst_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "hsn_code" varchar(16),
        "stock_movement_id" uuid NOT NULL,
        "description" text,
        CONSTRAINT "pk_sales_invoice_lines" PRIMARY KEY ("id")
      )
    `);
    // ── sales_charges — one table for the three parents ───────────────────────
    await queryRunner.query(`
      CREATE TABLE "sales_charges" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "parent_type" varchar(20) NOT NULL,
        "parent_id" uuid NOT NULL,
        "kind" varchar(20) NOT NULL,
        "label" varchar(80) NOT NULL,
        "amount" numeric(18,2) NOT NULL,
        "cgst_rate" numeric(5,2) NOT NULL DEFAULT 0,
        "sgst_rate" numeric(5,2) NOT NULL DEFAULT 0,
        "igst_rate" numeric(5,2) NOT NULL DEFAULT 0,
        "cgst_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "sgst_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "igst_amount" numeric(18,2) NOT NULL DEFAULT 0,
        CONSTRAINT "pk_sales_charges" PRIMARY KEY ("id")
      )
    `);
    // ── customer_receipts ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "customer_receipts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "customer_party_id" uuid NOT NULL,
        "site_id" uuid NOT NULL,
        "receipt_date" date NOT NULL,
        "mode" varchar(10) NOT NULL,
        "deposit_to_ledger_id" uuid NOT NULL,
        "amount" numeric(18,2) NOT NULL,
        "reference" varchar(80),
        "voucher_id" uuid NOT NULL,
        "notes" text,
        CONSTRAINT "pk_customer_receipts" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "customer_receipt_allocations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "customer_receipt_id" uuid NOT NULL,
        "sales_invoice_id" uuid NOT NULL,
        "amount" numeric(18,2) NOT NULL,
        CONSTRAINT "pk_customer_receipt_allocations" PRIMARY KEY ("id")
      )
    `);
    // ── credit_notes / debit_notes ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "credit_notes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "note_no" varchar(30) NOT NULL,
        "customer_party_id" uuid NOT NULL,
        "site_id" uuid NOT NULL,
        "invoice_id" uuid,
        "note_date" date NOT NULL,
        "reason" text NOT NULL,
        "taxable_amount" numeric(18,2) NOT NULL,
        "tax_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "total_amount" numeric(18,2) NOT NULL,
        "restocked" boolean NOT NULL DEFAULT false,
        "voucher_id" uuid NOT NULL,
        CONSTRAINT "pk_credit_notes" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "credit_note_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "credit_note_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "warehouse_id" uuid,
        "quantity" numeric(18,3),
        "rate" numeric(18,2) NOT NULL,
        "taxable_amount" numeric(18,2) NOT NULL,
        "cgst_rate" numeric(5,2) NOT NULL DEFAULT 0,
        "sgst_rate" numeric(5,2) NOT NULL DEFAULT 0,
        "igst_rate" numeric(5,2) NOT NULL DEFAULT 0,
        "tax_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "stock_movement_id" uuid,
        "description" text,
        CONSTRAINT "pk_credit_note_lines" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "debit_notes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "note_no" varchar(30) NOT NULL,
        "customer_party_id" uuid NOT NULL,
        "site_id" uuid NOT NULL,
        "invoice_id" uuid,
        "note_date" date NOT NULL,
        "reason" text NOT NULL,
        "taxable_amount" numeric(18,2) NOT NULL,
        "tax_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "total_amount" numeric(18,2) NOT NULL,
        "voucher_id" uuid NOT NULL,
        CONSTRAINT "pk_debit_notes" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "debit_note_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "debit_note_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "quantity" numeric(18,3),
        "rate" numeric(18,2) NOT NULL,
        "taxable_amount" numeric(18,2) NOT NULL,
        "cgst_rate" numeric(5,2) NOT NULL DEFAULT 0,
        "sgst_rate" numeric(5,2) NOT NULL DEFAULT 0,
        "igst_rate" numeric(5,2) NOT NULL DEFAULT 0,
        "tax_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "description" text,
        CONSTRAINT "pk_debit_note_lines" PRIMARY KEY ("id")
      )
    `);

    // ── CHECK constraints ─────────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "quotations" ADD CONSTRAINT "chk_quotations_status" CHECK ("status" IN ('draft','sent','accepted','rejected','cancelled','expired'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotations" ADD CONSTRAINT "chk_quotations_total_is_sum" CHECK ("total_amount" = "taxable_amount" + "cgst_amount" + "sgst_amount" + "igst_amount")`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotation_lines" ADD CONSTRAINT "chk_quote_lines_positive" CHECK ("quantity" > 0 AND "rate" >= 0 AND "discount" >= 0 AND "taxable_amount" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotation_lines" ADD CONSTRAINT "chk_quote_lines_one_gst_kind" CHECK ((("cgst_rate" + "sgst_rate") = 0) OR ("igst_rate" = 0))`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_orders" ADD CONSTRAINT "chk_sales_orders_status" CHECK ("status" IN ('open','partial','invoiced','cancelled'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_orders" ADD CONSTRAINT "chk_sales_orders_total_is_sum" CHECK ("total_amount" = "taxable_amount" + "cgst_amount" + "sgst_amount" + "igst_amount")`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_order_lines" ADD CONSTRAINT "chk_so_lines_positive" CHECK ("quantity" > 0 AND "rate" >= 0 AND "discount" >= 0 AND "invoiced_quantity" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_order_lines" ADD CONSTRAINT "chk_so_lines_one_gst_kind" CHECK ((("cgst_rate" + "sgst_rate") = 0) OR ("igst_rate" = 0))`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_invoices" ADD CONSTRAINT "chk_sales_invoices_status" CHECK ("status" IN ('open','partial','paid','cancelled'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_invoices" ADD CONSTRAINT "chk_sales_invoices_amounts_non_negative" CHECK ("taxable_amount" >= 0 AND "cgst_amount" >= 0 AND "sgst_amount" >= 0 AND "igst_amount" >= 0 AND "paid_amount" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_invoices" ADD CONSTRAINT "chk_sales_invoices_total_is_sum" CHECK ("total_amount" = "taxable_amount" + "cgst_amount" + "sgst_amount" + "igst_amount")`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_invoices" ADD CONSTRAINT "chk_sales_invoices_not_overpaid" CHECK ("paid_amount" <= "total_amount")`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "chk_invoice_lines_positive" CHECK ("quantity" > 0 AND "rate" >= 0 AND "discount" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "chk_invoice_lines_one_gst_kind" CHECK ((("cgst_rate" + "sgst_rate") = 0) OR ("igst_rate" = 0))`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_charges" ADD CONSTRAINT "chk_sales_charges_parent" CHECK ("parent_type" IN ('quotation','sales_order','sales_invoice'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_charges" ADD CONSTRAINT "chk_sales_charges_kind" CHECK ("kind" IN ('loading','transport','other'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_charges" ADD CONSTRAINT "chk_sales_charges_amount_non_negative" CHECK ("amount" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_charges" ADD CONSTRAINT "chk_sales_charges_one_gst_kind" CHECK ((("cgst_rate" + "sgst_rate") = 0) OR ("igst_rate" = 0))`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_receipts" ADD CONSTRAINT "chk_customer_receipts_mode" CHECK ("mode" IN ('cash','bank','upi'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_receipts" ADD CONSTRAINT "chk_customer_receipts_amount_positive" CHECK ("amount" > 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_receipt_allocations" ADD CONSTRAINT "chk_customer_allocations_amount_positive" CHECK ("amount" > 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_notes" ADD CONSTRAINT "chk_credit_notes_total_is_sum" CHECK ("total_amount" = "taxable_amount" + "tax_amount")`,
    );
    await queryRunner.query(
      `ALTER TABLE "debit_notes" ADD CONSTRAINT "chk_debit_notes_total_is_sum" CHECK ("total_amount" = "taxable_amount" + "tax_amount")`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_note_lines" ADD CONSTRAINT "chk_credit_note_lines_qty_or_null" CHECK ("quantity" IS NULL OR "quantity" > 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_note_lines" ADD CONSTRAINT "chk_credit_note_lines_warehouse_when_qty" CHECK ("quantity" IS NULL OR "warehouse_id" IS NOT NULL)`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_note_lines" ADD CONSTRAINT "chk_credit_note_lines_one_gst_kind" CHECK ((("cgst_rate" + "sgst_rate") = 0) OR ("igst_rate" = 0))`,
    );
    await queryRunner.query(
      `ALTER TABLE "debit_note_lines" ADD CONSTRAINT "chk_debit_note_lines_qty_or_null" CHECK ("quantity" IS NULL OR "quantity" > 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "debit_note_lines" ADD CONSTRAINT "chk_debit_note_lines_one_gst_kind" CHECK ((("cgst_rate" + "sgst_rate") = 0) OR ("igst_rate" = 0))`,
    );

    // ── unique indexes ────────────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_quotations_company_no" ON "quotations" ("company_id", "quote_no") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_sales_orders_company_no" ON "sales_orders" ("company_id", "order_no") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_sales_invoices_company_no" ON "sales_invoices" ("company_id", "invoice_no") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_credit_notes_company_no" ON "credit_notes" ("company_id", "note_no") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_debit_notes_company_no" ON "debit_notes" ("company_id", "note_no") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_customer_allocation_receipt_invoice" ON "customer_receipt_allocations" ("customer_receipt_id", "sales_invoice_id") WHERE "deleted_at" IS NULL`,
    );

    // ── indexes + FKs: tenant, children, references ───────────────────────────
    const simpleCompanyIdx = [
      'quotations',
      'quotation_lines',
      'sales_orders',
      'sales_order_lines',
      'sales_invoices',
      'sales_invoice_lines',
      'sales_charges',
      'customer_receipts',
      'customer_receipt_allocations',
      'credit_notes',
      'credit_note_lines',
      'debit_notes',
      'debit_note_lines',
    ];
    for (const t of simpleCompanyIdx) {
      await queryRunner.query(`CREATE INDEX "idx_${t}_company" ON "${t}" ("company_id")`);
      await queryRunner.query(
        `ALTER TABLE "${t}" ADD CONSTRAINT "fk_${t}_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE`,
      );
    }
    await queryRunner.query(`CREATE INDEX "idx_sales_charges_parent" ON "sales_charges" ("parent_type", "parent_id")`);

    // ── backfill the two new income ledgers for every existing company ───────
    // P8 adds LOADING_INCOME and OTHER_SALES_INCOME to the chart of accounts
    // seed (packages/shared/src/constants/accounting.ts). New companies pick
    // them up at creation, but companies born before P8 would never see them,
    // so an invoice with loading charges would fail with LEDGER_NOT_FOUND.
    await queryRunner.query(`
      INSERT INTO "ledgers" ("company_id", "group_id", "code", "name", "is_system")
      SELECT c."id", g."id", v.code, v.name, true
        FROM "companies" c
        JOIN "ledger_groups" g ON g."company_id" = c."id" AND g."code" = 'DIRECT_INCOME'
        CROSS JOIN (VALUES
          ('LOADING_INCOME', 'Loading Income'),
          ('OTHER_SALES_INCOME', 'Other Sales Income')
        ) AS v(code, name)
       WHERE NOT EXISTS (
         SELECT 1 FROM "ledgers" l WHERE l."company_id" = c."id" AND l."code" = v.code
       )
    `);

    // Business FKs
    const businessFks: [string, string, string, string, 'CASCADE' | 'RESTRICT'][] = [
      ['quotations', 'customer_party_id', 'parties', 'id', 'RESTRICT'],
      ['quotations', 'site_id', 'sites', 'id', 'RESTRICT'],
      ['quotation_lines', 'quotation_id', 'quotations', 'id', 'CASCADE'],
      ['quotation_lines', 'item_id', 'items', 'id', 'RESTRICT'],
      ['sales_orders', 'customer_party_id', 'parties', 'id', 'RESTRICT'],
      ['sales_orders', 'site_id', 'sites', 'id', 'RESTRICT'],
      ['sales_orders', 'quotation_id', 'quotations', 'id', 'RESTRICT'],
      ['sales_order_lines', 'sales_order_id', 'sales_orders', 'id', 'CASCADE'],
      ['sales_order_lines', 'item_id', 'items', 'id', 'RESTRICT'],
      ['sales_invoices', 'customer_party_id', 'parties', 'id', 'RESTRICT'],
      ['sales_invoices', 'site_id', 'sites', 'id', 'RESTRICT'],
      ['sales_invoices', 'sales_order_id', 'sales_orders', 'id', 'RESTRICT'],
      ['sales_invoices', 'voucher_id', 'vouchers', 'id', 'RESTRICT'],
      ['sales_invoice_lines', 'sales_invoice_id', 'sales_invoices', 'id', 'CASCADE'],
      ['sales_invoice_lines', 'item_id', 'items', 'id', 'RESTRICT'],
      ['sales_invoice_lines', 'warehouse_id', 'warehouses', 'id', 'RESTRICT'],
      ['sales_invoice_lines', 'stock_movement_id', 'stock_movements', 'id', 'RESTRICT'],
      ['customer_receipts', 'customer_party_id', 'parties', 'id', 'RESTRICT'],
      ['customer_receipts', 'site_id', 'sites', 'id', 'RESTRICT'],
      ['customer_receipts', 'deposit_to_ledger_id', 'ledgers', 'id', 'RESTRICT'],
      ['customer_receipts', 'voucher_id', 'vouchers', 'id', 'RESTRICT'],
      ['customer_receipt_allocations', 'customer_receipt_id', 'customer_receipts', 'id', 'CASCADE'],
      ['customer_receipt_allocations', 'sales_invoice_id', 'sales_invoices', 'id', 'RESTRICT'],
      ['credit_notes', 'customer_party_id', 'parties', 'id', 'RESTRICT'],
      ['credit_notes', 'site_id', 'sites', 'id', 'RESTRICT'],
      ['credit_notes', 'invoice_id', 'sales_invoices', 'id', 'RESTRICT'],
      ['credit_notes', 'voucher_id', 'vouchers', 'id', 'RESTRICT'],
      ['credit_note_lines', 'credit_note_id', 'credit_notes', 'id', 'CASCADE'],
      ['credit_note_lines', 'item_id', 'items', 'id', 'RESTRICT'],
      ['credit_note_lines', 'warehouse_id', 'warehouses', 'id', 'RESTRICT'],
      ['credit_note_lines', 'stock_movement_id', 'stock_movements', 'id', 'RESTRICT'],
      ['debit_notes', 'customer_party_id', 'parties', 'id', 'RESTRICT'],
      ['debit_notes', 'site_id', 'sites', 'id', 'RESTRICT'],
      ['debit_notes', 'invoice_id', 'sales_invoices', 'id', 'RESTRICT'],
      ['debit_notes', 'voucher_id', 'vouchers', 'id', 'RESTRICT'],
      ['debit_note_lines', 'debit_note_id', 'debit_notes', 'id', 'CASCADE'],
      ['debit_note_lines', 'item_id', 'items', 'id', 'RESTRICT'],
    ];
    for (const [table, col, refTable, refCol, mode] of businessFks) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD CONSTRAINT "fk_${table}_${col}" FOREIGN KEY ("${col}") REFERENCES "${refTable}"("${refCol}") ON DELETE ${mode}`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'debit_note_lines',
      'debit_notes',
      'credit_note_lines',
      'credit_notes',
      'customer_receipt_allocations',
      'customer_receipts',
      'sales_charges',
      'sales_invoice_lines',
      'sales_invoices',
      'sales_order_lines',
      'sales_orders',
      'quotation_lines',
      'quotations',
    ];
    for (const t of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS "${t}"`);
    }
  }
}
