import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P9.1a — dispatch & delivery (DSP-01, 02, 03, 05) and the LEK-04 gate
 * reconciliation it feeds. Hand-written, never generated (see AGENTS.md).
 *
 * Two tables, plus two changes to tables that already exist:
 *
 *  - `stock_movements.movement_type` gains `'dispatch'`, so a challan-first
 *    deduction is readable as its own kind in the register rather than hiding
 *    inside `'sale'`. The old CHECK is dropped and re-added, which is a widening
 *    — every row that satisfied the old constraint satisfies the new one.
 *  - `sales_invoices.dispatch_id`, nullable, so an invoice raised against a
 *    challan that already emptied the yard can skip its own deduction. Null
 *    means "no challan", which is every invoice written before today, so
 *    existing behaviour is untouched.
 *
 * The CHECKs carry the rules the service also enforces: a confirmed challan
 * has a confirmation time, a delivered one is signed for, a cancelled one says
 * why, and stock is only ever claimed as moved by a challan that was confirmed.
 */
export class Dispatch1792500000000 implements MigrationInterface {
  name = 'Dispatch1792500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "dispatches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "challan_no" varchar(30) NOT NULL,
        "site_id" uuid NOT NULL,
        "customer_party_id" uuid NOT NULL,
        "sales_invoice_id" uuid,
        "sales_order_id" uuid,
        "vehicle_id" uuid,
        "driver_id" uuid,
        "loading_group_id" uuid,
        "dispatch_date" date NOT NULL,
        "loading_location" varchar(200),
        "delivery_location" varchar(200),
        "status" varchar(20) NOT NULL DEFAULT 'draft',
        "moved_stock" boolean NOT NULL DEFAULT false,
        "confirmed_at" TIMESTAMP WITH TIME ZONE,
        "delivered_on" date,
        "received_by" varchar(100),
        "delivery_remarks" text,
        "cancel_reason" text,
        "notes" text,
        CONSTRAINT "pk_dispatches" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "dispatch_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "dispatch_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "warehouse_id" uuid NOT NULL,
        "quantity" numeric(18,3) NOT NULL,
        "notes" text,
        CONSTRAINT "pk_dispatch_lines" PRIMARY KEY ("id")
      )
    `);

    // ── rules the database keeps on its own ──────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "dispatches" ADD CONSTRAINT "chk_dispatches_status"
      CHECK ("status" IN ('draft','confirmed','delivered','cancelled'))
    `);
    await queryRunner.query(`
      ALTER TABLE "dispatches" ADD CONSTRAINT "chk_dispatches_confirmed_has_time"
      CHECK ("status" NOT IN ('confirmed','delivered') OR "confirmed_at" IS NOT NULL)
    `);
    await queryRunner.query(`
      ALTER TABLE "dispatches" ADD CONSTRAINT "chk_dispatches_delivered_is_signed"
      CHECK ("status" <> 'delivered' OR ("received_by" IS NOT NULL AND length(btrim("received_by")) > 0 AND "delivered_on" IS NOT NULL))
    `);
    await queryRunner.query(`
      ALTER TABLE "dispatches" ADD CONSTRAINT "chk_dispatches_cancel_has_reason"
      CHECK ("status" <> 'cancelled' OR ("cancel_reason" IS NOT NULL AND length(btrim("cancel_reason")) >= 10))
    `);
    // A draft has not left the gate, so it cannot have taken stock with it.
    await queryRunner.query(`
      ALTER TABLE "dispatches" ADD CONSTRAINT "chk_dispatches_moved_stock_only_when_out"
      CHECK ("moved_stock" = false OR "status" IN ('confirmed','delivered'))
    `);
    // ADR-041: the stock leaves once. A challan raised against an invoice never
    // deducts, because the invoice already did (ADR-038).
    await queryRunner.query(`
      ALTER TABLE "dispatches" ADD CONSTRAINT "chk_dispatches_invoice_linked_never_moves"
      CHECK ("sales_invoice_id" IS NULL OR "moved_stock" = false)
    `);
    await queryRunner.query(`
      ALTER TABLE "dispatch_lines" ADD CONSTRAINT "chk_dispatch_lines_qty_positive"
      CHECK ("quantity" > 0)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_dispatches_company_no" ON "dispatches" ("company_id", "challan_no") WHERE "deleted_at" IS NULL
    `);
    // One challan may not be loaded twice from the same yard for the same grade.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_dispatch_lines_item_warehouse" ON "dispatch_lines" ("dispatch_id", "item_id", "warehouse_id") WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`CREATE INDEX "idx_dispatches_date" ON "dispatches" ("company_id", "dispatch_date")`);
    await queryRunner.query(`CREATE INDEX "idx_dispatches_status" ON "dispatches" ("company_id", "status")`);
    await queryRunner.query(`CREATE INDEX "idx_dispatches_invoice" ON "dispatches" ("sales_invoice_id")`);

    // ── company scope and the ids a request body may point at (ADR-021) ───────
    await queryRunner.query(`CREATE INDEX "idx_dispatches_company" ON "dispatches" ("company_id")`);
    await queryRunner.query(`
      ALTER TABLE "dispatches" ADD CONSTRAINT "fk_dispatches_company"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`CREATE INDEX "idx_dispatch_lines_company" ON "dispatch_lines" ("company_id")`);
    await queryRunner.query(`
      ALTER TABLE "dispatch_lines" ADD CONSTRAINT "fk_dispatch_lines_company"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "dispatch_lines" ADD CONSTRAINT "fk_dispatch_lines_dispatch"
      FOREIGN KEY ("dispatch_id") REFERENCES "dispatches"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "dispatches" ADD CONSTRAINT "fk_dispatches_customer"
      FOREIGN KEY ("customer_party_id") REFERENCES "parties"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "dispatches" ADD CONSTRAINT "fk_dispatches_site"
      FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "dispatches" ADD CONSTRAINT "fk_dispatches_sales_invoice"
      FOREIGN KEY ("sales_invoice_id") REFERENCES "sales_invoices"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "dispatches" ADD CONSTRAINT "fk_dispatches_sales_order"
      FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "dispatches" ADD CONSTRAINT "fk_dispatches_vehicle"
      FOREIGN KEY ("vehicle_id") REFERENCES "transport_vehicles"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "dispatches" ADD CONSTRAINT "fk_dispatches_driver"
      FOREIGN KEY ("driver_id") REFERENCES "transport_drivers"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "dispatches" ADD CONSTRAINT "fk_dispatches_loading_group"
      FOREIGN KEY ("loading_group_id") REFERENCES "labour_groups"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "dispatch_lines" ADD CONSTRAINT "fk_dispatch_lines_item"
      FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "dispatch_lines" ADD CONSTRAINT "fk_dispatch_lines_warehouse"
      FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT
    `);

    // ── widen the stock movement kinds ───────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "stock_movements" DROP CONSTRAINT "chk_stock_movements_type"`);
    await queryRunner.query(`
      ALTER TABLE "stock_movements" ADD CONSTRAINT "chk_stock_movements_type"
      CHECK ("movement_type" IN ('opening','purchase','production','sale','dispatch','wastage','adjustment','transfer'))
    `);

    // ── let an invoice know a challan already emptied the yard ───────────────
    await queryRunner.query(`ALTER TABLE "sales_invoices" ADD COLUMN "dispatch_id" uuid`);
    // SET NULL, not RESTRICT, and deliberately so: `dispatches` and
    // `sales_invoices` point at each other (one invoice can be delivered by
    // several challans; one challan is billed by at most one invoice), so a
    // pair of RESTRICTs would be a cycle no delete order can satisfy. Rows are
    // soft-deleted in production, so this only ever fires on a hard teardown,
    // where "the challan is gone, so the invoice has none on file" is right.
    await queryRunner.query(`
      ALTER TABLE "sales_invoices" ADD CONSTRAINT "fk_sales_invoices_dispatch"
      FOREIGN KEY ("dispatch_id") REFERENCES "dispatches"("id") ON DELETE SET NULL
    `);
    // A challan may be billed once. Two invoices against one challan would
    // bill the same truck twice, which is exactly what LEK-04 exists to catch.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_sales_invoices_dispatch" ON "sales_invoices" ("dispatch_id") WHERE "dispatch_id" IS NOT NULL AND "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_sales_invoices_dispatch"`);
    await queryRunner.query(`ALTER TABLE "sales_invoices" DROP CONSTRAINT IF EXISTS "fk_sales_invoices_dispatch"`);
    await queryRunner.query(`ALTER TABLE "sales_invoices" DROP COLUMN IF EXISTS "dispatch_id"`);
    await queryRunner.query(`ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "chk_stock_movements_type"`);
    await queryRunner.query(`
      ALTER TABLE "stock_movements" ADD CONSTRAINT "chk_stock_movements_type"
      CHECK ("movement_type" IN ('opening','purchase','production','sale','wastage','adjustment','transfer'))
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "dispatch_lines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dispatches"`);
  }
}
