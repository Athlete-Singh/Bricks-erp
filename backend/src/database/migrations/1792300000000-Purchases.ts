import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P7 — the purchases engine (PUR-01…06, GST-03). Hand-written, never generated
 * (see AGENTS.md).
 *
 * Ten tables. The CHECK constraints carry rules the service also enforces,
 * because a rule living only in TypeScript is one bad migration from gone —
 * notably that a bill's total really is the sum of its parts, that a bill
 * cannot be paid more than it is worth, and that a line carries either
 * CGST + SGST or IGST but never both.
 */
export class Purchases1792300000000 implements MigrationInterface {
  name = 'Purchases1792300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "purchase_orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "order_no" varchar(30) NOT NULL,
        "supplier_party_id" uuid NOT NULL,
        "site_id" uuid NOT NULL,
        "order_date" date NOT NULL,
        "expected_date" date,
        "status" varchar(20) NOT NULL DEFAULT 'open',
        "notes" text,
        CONSTRAINT "pk_purchase_orders" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "purchase_order_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "purchase_order_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "quantity" numeric(18,3) NOT NULL,
        "rate" numeric(18,2) NOT NULL,
        "received_quantity" numeric(18,3) NOT NULL DEFAULT 0,
        CONSTRAINT "pk_purchase_order_lines" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "goods_receipts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "grn_no" varchar(30) NOT NULL,
        "supplier_party_id" uuid NOT NULL,
        "site_id" uuid NOT NULL,
        "purchase_order_id" uuid,
        "receipt_date" date NOT NULL,
        "challan_no" varchar(50),
        "notes" text,
        CONSTRAINT "pk_goods_receipts" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "goods_receipt_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "goods_receipt_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "warehouse_id" uuid NOT NULL,
        "quantity" numeric(18,3) NOT NULL,
        "stock_movement_id" uuid NOT NULL,
        CONSTRAINT "pk_goods_receipt_lines" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "purchase_bills" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "supplier_party_id" uuid NOT NULL,
        "site_id" uuid NOT NULL,
        "supplier_invoice_no" varchar(50) NOT NULL,
        "bill_date" date NOT NULL,
        "due_date" date,
        "grn_id" uuid,
        "taxable_amount" numeric(18,2) NOT NULL,
        "cgst_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "sgst_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "igst_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "total_amount" numeric(18,2) NOT NULL,
        "paid_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "voucher_id" uuid NOT NULL,
        "notes" text,
        CONSTRAINT "pk_purchase_bills" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "purchase_bill_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "purchase_bill_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "quantity" numeric(18,3) NOT NULL,
        "rate" numeric(18,2) NOT NULL,
        "taxable_amount" numeric(18,2) NOT NULL,
        "cgst_rate" numeric(5,2) NOT NULL DEFAULT 0,
        "sgst_rate" numeric(5,2) NOT NULL DEFAULT 0,
        "igst_rate" numeric(5,2) NOT NULL DEFAULT 0,
        "cgst_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "sgst_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "igst_amount" numeric(18,2) NOT NULL DEFAULT 0,
        CONSTRAINT "pk_purchase_bill_lines" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "supplier_payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "supplier_party_id" uuid NOT NULL,
        "site_id" uuid NOT NULL,
        "payment_date" date NOT NULL,
        "mode" varchar(10) NOT NULL,
        "paid_from_ledger_id" uuid NOT NULL,
        "amount" numeric(18,2) NOT NULL,
        "reference" varchar(80),
        "voucher_id" uuid NOT NULL,
        "notes" text,
        CONSTRAINT "pk_supplier_payments" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "supplier_payment_allocations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "supplier_payment_id" uuid NOT NULL,
        "purchase_bill_id" uuid NOT NULL,
        "amount" numeric(18,2) NOT NULL,
        CONSTRAINT "pk_supplier_payment_allocations" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "purchase_returns" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "supplier_party_id" uuid NOT NULL,
        "site_id" uuid NOT NULL,
        "bill_id" uuid,
        "return_date" date NOT NULL,
        "reason" text NOT NULL,
        "taxable_amount" numeric(18,2) NOT NULL,
        "tax_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "total_amount" numeric(18,2) NOT NULL,
        "voucher_id" uuid NOT NULL,
        CONSTRAINT "pk_purchase_returns" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "purchase_return_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "purchase_return_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "warehouse_id" uuid NOT NULL,
        "quantity" numeric(18,3) NOT NULL,
        "rate" numeric(18,2) NOT NULL,
        "taxable_amount" numeric(18,2) NOT NULL,
        "tax_amount" numeric(18,2) NOT NULL DEFAULT 0,
        "stock_movement_id" uuid NOT NULL,
        CONSTRAINT "pk_purchase_return_lines" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "purchase_orders" ADD CONSTRAINT "chk_purchase_orders_status" CHECK ("status" IN ('open','partial','received','cancelled'))
    `);
    await queryRunner.query(`
      ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "chk_po_lines_positive" CHECK ("quantity" > 0 AND "rate" >= 0 AND "received_quantity" >= 0)
    `);
    await queryRunner.query(`
      ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "chk_grn_lines_qty_positive" CHECK ("quantity" > 0)
    `);
    await queryRunner.query(`
      ALTER TABLE "purchase_bills" ADD CONSTRAINT "chk_bills_amounts_non_negative" CHECK ("taxable_amount" >= 0 AND "cgst_amount" >= 0 AND "sgst_amount" >= 0 AND "igst_amount" >= 0 AND "paid_amount" >= 0)
    `);
    await queryRunner.query(`
      ALTER TABLE "purchase_bills" ADD CONSTRAINT "chk_bills_total_is_sum" CHECK ("total_amount" = "taxable_amount" + "cgst_amount" + "sgst_amount" + "igst_amount")
    `);
    await queryRunner.query(`
      ALTER TABLE "purchase_bills" ADD CONSTRAINT "chk_bills_not_overpaid" CHECK ("paid_amount" <= "total_amount")
    `);
    await queryRunner.query(`
      ALTER TABLE "purchase_bill_lines" ADD CONSTRAINT "chk_bill_lines_one_gst_kind" CHECK ((("cgst_rate" + "sgst_rate") = 0) OR ("igst_rate" = 0))
    `);
    await queryRunner.query(`
      ALTER TABLE "supplier_payments" ADD CONSTRAINT "chk_supplier_payments_mode" CHECK ("mode" IN ('cash','bank','upi'))
    `);
    await queryRunner.query(`
      ALTER TABLE "supplier_payments" ADD CONSTRAINT "chk_supplier_payments_amount_positive" CHECK ("amount" > 0)
    `);
    await queryRunner.query(`
      ALTER TABLE "supplier_payment_allocations" ADD CONSTRAINT "chk_allocations_amount_positive" CHECK ("amount" > 0)
    `);
    await queryRunner.query(`
      ALTER TABLE "purchase_returns" ADD CONSTRAINT "chk_returns_total_is_sum" CHECK ("total_amount" = "taxable_amount" + "tax_amount")
    `);
    await queryRunner.query(`
      ALTER TABLE "purchase_return_lines" ADD CONSTRAINT "chk_return_lines_qty_positive" CHECK ("quantity" > 0)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_purchase_orders_company_no" ON "purchase_orders" ("company_id", "order_no") WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_goods_receipts_company_no" ON "goods_receipts" ("company_id", "grn_no") WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_purchase_bills_supplier_invoice" ON "purchase_bills" ("company_id", "supplier_party_id", "supplier_invoice_no") WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_allocation_payment_bill" ON "supplier_payment_allocations" ("supplier_payment_id", "purchase_bill_id") WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`CREATE INDEX "idx_purchase_orders_company" ON "purchase_orders" ("company_id")`);
    await queryRunner.query(`
      ALTER TABLE "purchase_orders" ADD CONSTRAINT "fk_purchase_orders_company"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`CREATE INDEX "idx_purchase_order_lines_company" ON "purchase_order_lines" ("company_id")`);
    await queryRunner.query(`
      ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "fk_purchase_order_lines_company"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`CREATE INDEX "idx_goods_receipts_company" ON "goods_receipts" ("company_id")`);
    await queryRunner.query(`
      ALTER TABLE "goods_receipts" ADD CONSTRAINT "fk_goods_receipts_company"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`CREATE INDEX "idx_goods_receipt_lines_company" ON "goods_receipt_lines" ("company_id")`);
    await queryRunner.query(`
      ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "fk_goods_receipt_lines_company"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`CREATE INDEX "idx_purchase_bills_company" ON "purchase_bills" ("company_id")`);
    await queryRunner.query(`
      ALTER TABLE "purchase_bills" ADD CONSTRAINT "fk_purchase_bills_company"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`CREATE INDEX "idx_purchase_bill_lines_company" ON "purchase_bill_lines" ("company_id")`);
    await queryRunner.query(`
      ALTER TABLE "purchase_bill_lines" ADD CONSTRAINT "fk_purchase_bill_lines_company"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`CREATE INDEX "idx_supplier_payments_company" ON "supplier_payments" ("company_id")`);
    await queryRunner.query(`
      ALTER TABLE "supplier_payments" ADD CONSTRAINT "fk_supplier_payments_company"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_supplier_payment_allocations_company" ON "supplier_payment_allocations" ("company_id")`,
    );
    await queryRunner.query(`
      ALTER TABLE "supplier_payment_allocations" ADD CONSTRAINT "fk_supplier_payment_allocations_company"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`CREATE INDEX "idx_purchase_returns_company" ON "purchase_returns" ("company_id")`);
    await queryRunner.query(`
      ALTER TABLE "purchase_returns" ADD CONSTRAINT "fk_purchase_returns_company"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_purchase_return_lines_company" ON "purchase_return_lines" ("company_id")`,
    );
    await queryRunner.query(`
      ALTER TABLE "purchase_return_lines" ADD CONSTRAINT "fk_purchase_return_lines_company"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "purchase_orders" ADD CONSTRAINT "fk_purchase_orders_supplier_party_id"
      FOREIGN KEY ("supplier_party_id") REFERENCES "parties"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "purchase_orders" ADD CONSTRAINT "fk_purchase_orders_site_id"
      FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "fk_purchase_order_lines_purchase_order_id"
      FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "fk_purchase_order_lines_item_id"
      FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "goods_receipts" ADD CONSTRAINT "fk_goods_receipts_supplier_party_id"
      FOREIGN KEY ("supplier_party_id") REFERENCES "parties"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "goods_receipts" ADD CONSTRAINT "fk_goods_receipts_site_id"
      FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "goods_receipts" ADD CONSTRAINT "fk_goods_receipts_purchase_order_id"
      FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "fk_goods_receipt_lines_goods_receipt_id"
      FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipts"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "fk_goods_receipt_lines_item_id"
      FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "fk_goods_receipt_lines_warehouse_id"
      FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "fk_goods_receipt_lines_stock_movement_id"
      FOREIGN KEY ("stock_movement_id") REFERENCES "stock_movements"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "purchase_bills" ADD CONSTRAINT "fk_purchase_bills_supplier_party_id"
      FOREIGN KEY ("supplier_party_id") REFERENCES "parties"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "purchase_bills" ADD CONSTRAINT "fk_purchase_bills_grn_id"
      FOREIGN KEY ("grn_id") REFERENCES "goods_receipts"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "purchase_bills" ADD CONSTRAINT "fk_purchase_bills_voucher_id"
      FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "purchase_bill_lines" ADD CONSTRAINT "fk_purchase_bill_lines_purchase_bill_id"
      FOREIGN KEY ("purchase_bill_id") REFERENCES "purchase_bills"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "purchase_bill_lines" ADD CONSTRAINT "fk_purchase_bill_lines_item_id"
      FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "supplier_payments" ADD CONSTRAINT "fk_supplier_payments_supplier_party_id"
      FOREIGN KEY ("supplier_party_id") REFERENCES "parties"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "supplier_payments" ADD CONSTRAINT "fk_supplier_payments_paid_from_ledger_id"
      FOREIGN KEY ("paid_from_ledger_id") REFERENCES "ledgers"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "supplier_payments" ADD CONSTRAINT "fk_supplier_payments_voucher_id"
      FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "supplier_payment_allocations" ADD CONSTRAINT "fk_supplier_payment_allocations_supplier_payment_id"
      FOREIGN KEY ("supplier_payment_id") REFERENCES "supplier_payments"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "supplier_payment_allocations" ADD CONSTRAINT "fk_supplier_payment_allocations_purchase_bill_id"
      FOREIGN KEY ("purchase_bill_id") REFERENCES "purchase_bills"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "purchase_returns" ADD CONSTRAINT "fk_purchase_returns_supplier_party_id"
      FOREIGN KEY ("supplier_party_id") REFERENCES "parties"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "purchase_returns" ADD CONSTRAINT "fk_purchase_returns_bill_id"
      FOREIGN KEY ("bill_id") REFERENCES "purchase_bills"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "purchase_returns" ADD CONSTRAINT "fk_purchase_returns_voucher_id"
      FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "purchase_return_lines" ADD CONSTRAINT "fk_purchase_return_lines_purchase_return_id"
      FOREIGN KEY ("purchase_return_id") REFERENCES "purchase_returns"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "purchase_return_lines" ADD CONSTRAINT "fk_purchase_return_lines_stock_movement_id"
      FOREIGN KEY ("stock_movement_id") REFERENCES "stock_movements"("id") ON DELETE RESTRICT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "purchase_return_lines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "purchase_returns"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "supplier_payment_allocations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "supplier_payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "purchase_bill_lines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "purchase_bills"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "goods_receipt_lines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "goods_receipts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "purchase_order_lines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "purchase_orders"`);
  }
}
