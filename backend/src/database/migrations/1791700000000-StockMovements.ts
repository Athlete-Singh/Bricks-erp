import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * INV-04 — the stock ledger. Written by hand, not generated (see AGENTS.md).
 *
 * The CHECK constraints are the point: `StockService` enforces the same rules,
 * but a rule that lives only in TypeScript is one bad migration or one direct
 * SQL fix away from being gone, which is exactly what happened to the schema in
 * P3.
 */
export class StockMovements1791700000000 implements MigrationInterface {
  name = 'StockMovements1791700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "stock_movements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "company_id" uuid NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "site_id" uuid NOT NULL,
        "warehouse_id" uuid NOT NULL,
        "item_id" uuid,
        "brick_type_id" uuid,
        "movement_type" character varying(20) NOT NULL,
        "quantity_in" numeric(18,3) NOT NULL DEFAULT 0,
        "quantity_out" numeric(18,3) NOT NULL DEFAULT 0,
        "movement_date" date NOT NULL,
        "source_type" character varying(30),
        "source_id" uuid,
        "notes" text,
        CONSTRAINT "pk_stock_movements" PRIMARY KEY ("id")
      )
    `);

    // ADR-023 — about an item or a grade, never both and never neither.
    await queryRunner.query(`
      ALTER TABLE "stock_movements" ADD CONSTRAINT "chk_stock_movements_one_subject"
      CHECK (("item_id" IS NOT NULL) <> ("brick_type_id" IS NOT NULL))
    `);

    // ADR-024 — one-sided, non-negative, and never a no-op row.
    await queryRunner.query(`
      ALTER TABLE "stock_movements" ADD CONSTRAINT "chk_stock_movements_one_side"
      CHECK (("quantity_in" > 0 AND "quantity_out" = 0) OR ("quantity_out" > 0 AND "quantity_in" = 0))
    `);
    await queryRunner.query(`
      ALTER TABLE "stock_movements" ADD CONSTRAINT "chk_stock_movements_not_negative"
      CHECK ("quantity_in" >= 0 AND "quantity_out" >= 0)
    `);

    await queryRunner.query(`
      ALTER TABLE "stock_movements" ADD CONSTRAINT "chk_stock_movements_type"
      CHECK ("movement_type" IN ('opening','purchase','production','sale','wastage','adjustment','transfer'))
    `);

    // An adjustment must say why — INV-06, and ADR-026's escape hatch.
    await queryRunner.query(`
      ALTER TABLE "stock_movements" ADD CONSTRAINT "chk_stock_movements_adjustment_reason"
      CHECK ("movement_type" <> 'adjustment' OR ("notes" IS NOT NULL AND length(btrim("notes")) >= 10))
    `);

    await queryRunner.query(`CREATE INDEX "idx_stock_movements_company" ON "stock_movements" ("company_id")`);
    await queryRunner.query(
      `CREATE INDEX "idx_stock_movements_company_date" ON "stock_movements" ("company_id", "movement_date")`,
    );
    // The balance query groups by these; without it every closing balance is a scan.
    await queryRunner.query(
      `CREATE INDEX "idx_stock_movements_balance" ON "stock_movements" ("company_id", "warehouse_id", "item_id", "brick_type_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_stock_movements_source" ON "stock_movements" ("source_type", "source_id") WHERE "source_id" IS NOT NULL`,
    );

    // One opening row per subject per warehouse — a second would silently double it.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_stock_movements_opening_item"
      ON "stock_movements" ("warehouse_id", "item_id")
      WHERE "movement_type" = 'opening' AND "item_id" IS NOT NULL AND "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_stock_movements_opening_grade"
      ON "stock_movements" ("warehouse_id", "brick_type_id")
      WHERE "movement_type" = 'opening' AND "brick_type_id" IS NOT NULL AND "deleted_at" IS NULL
    `);

    for (const [column, table, onDelete] of [
      ['company_id', 'companies', 'CASCADE'],
      ['site_id', 'sites', 'RESTRICT'],
      ['warehouse_id', 'warehouses', 'RESTRICT'],
      ['item_id', 'items', 'RESTRICT'],
      ['brick_type_id', 'brick_types', 'RESTRICT'],
    ]) {
      await queryRunner.query(`
        ALTER TABLE "stock_movements" ADD CONSTRAINT "fk_stock_movements_${column}"
        FOREIGN KEY ("${column}") REFERENCES "${table}"("id") ON DELETE ${onDelete}
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "stock_movements"`);
  }
}
