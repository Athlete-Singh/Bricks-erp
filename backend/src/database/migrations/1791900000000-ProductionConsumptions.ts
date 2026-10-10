import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P5.1b — raw-material consumption at a production stage (PRD-04).
 *
 * One row per (stage entry, item, source warehouse) with the exact
 * `stock_movements` row written in the same transaction. The partial unique
 * key stops the same stage drawing the same item from the same warehouse
 * twice; two warehouses or two items on one stage are allowed because they
 * are two separate stock movements.
 *
 * Hand-written, never generated (see AGENTS.md).
 */
export class ProductionConsumptions1791900000000 implements MigrationInterface {
  name = 'ProductionConsumptions1791900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "production_consumptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "company_id" uuid NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "entry_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "warehouse_id" uuid NOT NULL,
        "quantity" numeric(18,3) NOT NULL,
        "stock_movement_id" uuid NOT NULL,
        CONSTRAINT "pk_production_consumptions" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "production_consumptions" ADD CONSTRAINT "chk_production_consumptions_qty_positive"
      CHECK ("quantity" > 0)
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_production_consumptions_company" ON "production_consumptions" ("company_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_production_consumptions_entry" ON "production_consumptions" ("entry_id")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_production_consumptions_item" ON "production_consumptions" ("item_id")`);
    await queryRunner.query(
      `CREATE INDEX "idx_production_consumptions_movement" ON "production_consumptions" ("stock_movement_id")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_production_consumptions_entry_item_warehouse"
      ON "production_consumptions" ("entry_id", "item_id", "warehouse_id")
      WHERE "deleted_at" IS NULL
    `);

    for (const [column, table, onDelete] of [
      ['company_id', 'companies', 'CASCADE'],
      ['entry_id', 'production_entries', 'CASCADE'],
      ['item_id', 'items', 'RESTRICT'],
      ['warehouse_id', 'warehouses', 'RESTRICT'],
      ['stock_movement_id', 'stock_movements', 'RESTRICT'],
    ]) {
      await queryRunner.query(`
        ALTER TABLE "production_consumptions" ADD CONSTRAINT "fk_production_consumptions_${column}"
        FOREIGN KEY ("${column}") REFERENCES "${table}"("id") ON DELETE ${onDelete}
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "production_consumptions"`);
  }
}
