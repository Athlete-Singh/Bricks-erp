import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P5.1a — production batches, stage entries and sorting outputs. Hand-written,
 * never generated (see AGENTS.md).
 *
 * The three tables mirror the physical flow: a batch is one chamber on one
 * date, a stage entry is a row per batch per stage (making/drying/firing/sorting),
 * and sorting also writes a row per good brick grade produced. Each sorting
 * output row points at the `stock_movements` row written in the same
 * transaction, so a closing balance can be walked back to the chamber that
 * produced it.
 */
export class Production1791800000000 implements MigrationInterface {
  name = 'Production1791800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- production_batches ------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "production_batches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "company_id" uuid NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "site_id" uuid NOT NULL,
        "chamber" varchar(20) NOT NULL,
        "batch_date" date NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'open',
        "notes" text,
        CONSTRAINT "pk_production_batches" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "production_batches" ADD CONSTRAINT "chk_production_batches_status"
      CHECK ("status" IN ('open','firing','sorted','closed'))
    `);
    await queryRunner.query(`
      ALTER TABLE "production_batches" ADD CONSTRAINT "chk_production_batches_chamber_nonblank"
      CHECK (length(btrim("chamber")) > 0)
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_production_batches_company_date" ON "production_batches" ("company_id", "batch_date")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_production_batches_site" ON "production_batches" ("site_id")`);
    // PRD-02 — one batch per (kiln, chamber, date). A second would be the same
    // chamber loaded twice on the same day, which is a mistake, not a case to
    // allow silently.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_production_batches_identity"
      ON "production_batches" ("company_id", "site_id", "chamber", "batch_date")
      WHERE "deleted_at" IS NULL
    `);

    for (const [column, table, onDelete] of [
      ['company_id', 'companies', 'CASCADE'],
      ['site_id', 'sites', 'RESTRICT'],
    ]) {
      await queryRunner.query(`
        ALTER TABLE "production_batches" ADD CONSTRAINT "fk_production_batches_${column}"
        FOREIGN KEY ("${column}") REFERENCES "${table}"("id") ON DELETE ${onDelete}
      `);
    }

    // ---- production_entries ------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "production_entries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "company_id" uuid NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "batch_id" uuid NOT NULL,
        "stage" varchar(16) NOT NULL,
        "entry_date" date NOT NULL,
        "green_bricks" numeric(18,3) NOT NULL DEFAULT 0,
        "fired_bricks" numeric(18,3) NOT NULL DEFAULT 0,
        "broken_bricks" numeric(18,3) NOT NULL DEFAULT 0,
        "reject_bricks" numeric(18,3) NOT NULL DEFAULT 0,
        "sardar_party_id" uuid,
        "warehouse_id" uuid,
        "notes" text,
        CONSTRAINT "pk_production_entries" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "production_entries" ADD CONSTRAINT "chk_production_entries_stage"
      CHECK ("stage" IN ('making','drying','firing','sorting'))
    `);
    // Counts must never go negative — they are not stock movements and so are
    // not guarded by `StockService`.
    await queryRunner.query(`
      ALTER TABLE "production_entries" ADD CONSTRAINT "chk_production_entries_counts_nonneg"
      CHECK (
        "green_bricks" >= 0 AND
        "fired_bricks" >= 0 AND
        "broken_bricks" >= 0 AND
        "reject_bricks" >= 0
      )
    `);
    // Each stage carries only its own count — a making row with a fired count,
    // or a sorting row with a green count, would scramble LEK-01's arithmetic.
    await queryRunner.query(`
      ALTER TABLE "production_entries" ADD CONSTRAINT "chk_production_entries_stage_counts"
      CHECK (
        ("stage" = 'making'  AND "green_bricks"  > 0 AND "fired_bricks" = 0 AND "broken_bricks" = 0 AND "reject_bricks" = 0 AND "warehouse_id" IS NULL) OR
        ("stage" = 'drying'  AND "green_bricks"  = 0 AND "fired_bricks" = 0 AND "broken_bricks" = 0 AND "reject_bricks" = 0 AND "sardar_party_id" IS NULL AND "warehouse_id" IS NULL) OR
        ("stage" = 'firing'  AND "fired_bricks"  > 0 AND "green_bricks" = 0 AND "broken_bricks" = 0 AND "reject_bricks" = 0 AND "sardar_party_id" IS NULL AND "warehouse_id" IS NULL) OR
        ("stage" = 'sorting' AND "warehouse_id" IS NOT NULL AND "green_bricks" = 0 AND "fired_bricks" = 0 AND "sardar_party_id" IS NULL)
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_production_entries_batch" ON "production_entries" ("batch_id")`);
    await queryRunner.query(
      `CREATE INDEX "idx_production_entries_company_date" ON "production_entries" ("company_id", "entry_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_production_entries_sardar" ON "production_entries" ("sardar_party_id") WHERE "sardar_party_id" IS NOT NULL`,
    );
    // One entry per (batch, stage) — a batch is fired once, sorted once.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_production_entries_batch_stage"
      ON "production_entries" ("batch_id", "stage")
      WHERE "deleted_at" IS NULL
    `);

    for (const [column, table, onDelete] of [
      ['company_id', 'companies', 'CASCADE'],
      ['batch_id', 'production_batches', 'CASCADE'],
      ['sardar_party_id', 'parties', 'RESTRICT'],
      ['warehouse_id', 'warehouses', 'RESTRICT'],
    ]) {
      await queryRunner.query(`
        ALTER TABLE "production_entries" ADD CONSTRAINT "fk_production_entries_${column}"
        FOREIGN KEY ("${column}") REFERENCES "${table}"("id") ON DELETE ${onDelete}
      `);
    }

    // ---- production_sorting_outputs ---------------------------------------
    await queryRunner.query(`
      CREATE TABLE "production_sorting_outputs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "company_id" uuid NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "entry_id" uuid NOT NULL,
        "brick_type_id" uuid NOT NULL,
        "quantity" numeric(18,3) NOT NULL,
        "stock_movement_id" uuid NOT NULL,
        CONSTRAINT "pk_production_sorting_outputs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "production_sorting_outputs" ADD CONSTRAINT "chk_production_sorting_outputs_qty_positive"
      CHECK ("quantity" > 0)
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_production_sorting_outputs_company" ON "production_sorting_outputs" ("company_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_production_sorting_outputs_entry" ON "production_sorting_outputs" ("entry_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_production_sorting_outputs_grade" ON "production_sorting_outputs" ("brick_type_id")`,
    );
    // One row per (sorting entry, grade). A second would duplicate the stock
    // movement — a mistake no later arithmetic could detect.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_production_sorting_outputs_entry_grade"
      ON "production_sorting_outputs" ("entry_id", "brick_type_id")
      WHERE "deleted_at" IS NULL
    `);

    for (const [column, table, onDelete] of [
      ['company_id', 'companies', 'CASCADE'],
      ['entry_id', 'production_entries', 'CASCADE'],
      ['brick_type_id', 'brick_types', 'RESTRICT'],
      ['stock_movement_id', 'stock_movements', 'RESTRICT'],
    ]) {
      await queryRunner.query(`
        ALTER TABLE "production_sorting_outputs" ADD CONSTRAINT "fk_production_sorting_outputs_${column}"
        FOREIGN KEY ("${column}") REFERENCES "${table}"("id") ON DELETE ${onDelete}
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "production_sorting_outputs"`);
    await queryRunner.query(`DROP TABLE "production_entries"`);
    await queryRunner.query(`DROP TABLE "production_batches"`);
  }
}
