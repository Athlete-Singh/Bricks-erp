import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P11 audit follow-up — a brick grade is an item (ADR-051).
 * Hand-written, never generated (see AGENTS.md).
 *
 * Until now the yard had two ledgers for the same bricks. Production sorted
 * into `brick_type_id`, sales and dispatch took out of `item_id`, and nothing
 * joined the two: a kiln could fire 50,000 bricks and still be refused a sale
 * for want of stock, and no report could tell what a grade actually fetched.
 *
 * One column fixes it. `brick_types.item_id` ties each grade to exactly one
 * sellable item, every brick movement now carries that item as its subject,
 * and `brick_type_id` stays on the movement as the grade it was — descriptive,
 * not the thing the balance is keyed on.
 *
 * Existing rows are carried, not reset: a grade with an item of the same name
 * adopts it, and a grade with none gets one created from its own name so no
 * company comes out of this migration unable to sell what it has fired.
 */
export class BrickGradeIsAnItem1792900000000 implements MigrationInterface {
  name = 'BrickGradeIsAnItem1792900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "brick_types" ADD COLUMN "item_id" uuid`);

    // Adopt an item that already stands for this grade, else make one. The
    // unit matters only for how a quantity reads, so an existing one is
    // preferred over inventing a second way to say the same thing.
    await queryRunner.query(`
      DO $$
      DECLARE
        bt RECORD;
        v_item uuid;
        v_unit uuid;
        v_name text;
      BEGIN
        FOR bt IN SELECT "id", "company_id", "grade" FROM "brick_types" WHERE "item_id" IS NULL LOOP
          SELECT i."id" INTO v_item
          FROM "items" i
          WHERE i."company_id" = bt."company_id" AND i."deleted_at" IS NULL
            AND lower(i."name") IN (lower(bt."grade"), lower(bt."grade" || ' brick'), lower(bt."grade" || ' bricks'))
            AND NOT EXISTS (SELECT 1 FROM "brick_types" b2 WHERE b2."item_id" = i."id")
          ORDER BY i."created_at"
          LIMIT 1;

          IF v_item IS NULL THEN
            SELECT u."id" INTO v_unit
            FROM "units" u
            WHERE u."company_id" = bt."company_id" AND u."deleted_at" IS NULL
            ORDER BY (lower(u."abbreviation") IN ('k', 'nos', 'no', 'pcs')) DESC, u."created_at"
            LIMIT 1;

            IF v_unit IS NULL THEN
              INSERT INTO "units" ("company_id", "name", "abbreviation")
              VALUES (bt."company_id", 'Thousand', 'K')
              RETURNING "id" INTO v_unit;
            END IF;

            v_name := bt."grade";
            IF EXISTS (
              SELECT 1 FROM "items" i
              WHERE i."company_id" = bt."company_id" AND i."deleted_at" IS NULL AND lower(i."name") = lower(v_name)
            ) THEN
              v_name := bt."grade" || ' Brick';
            END IF;

            INSERT INTO "items" ("company_id", "name", "category", "unit_id")
            VALUES (bt."company_id", v_name, 'other', v_unit)
            RETURNING "id" INTO v_item;
          END IF;

          UPDATE "brick_types" SET "item_id" = v_item WHERE "id" = bt."id";
        END LOOP;
      END $$;
    `);

    await queryRunner.query(`ALTER TABLE "brick_types" ALTER COLUMN "item_id" SET NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "brick_types" ADD CONSTRAINT "fk_brick_types_item_id"
      FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT
    `);
    // One item, one grade. Two grades sharing an item would put two names on
    // one pile and leave the register unable to say which was sold.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_brick_types_item" ON "brick_types" ("item_id") WHERE "deleted_at" IS NULL
    `);

    // The old CHECK says a movement is about an item *or* a grade, so it has
    // to go before the backfill can give a grade row its item — the two
    // columns are about to stop being alternatives.
    await queryRunner.query(`ALTER TABLE "stock_movements" DROP CONSTRAINT "chk_stock_movements_one_subject"`);

    // Every brick that was ever sorted into the yard now also names its item,
    // so the balance that production wrote and the balance sales reads are the
    // same number.
    await queryRunner.query(`
      UPDATE "stock_movements" m
      SET "item_id" = bt."item_id"
      FROM "brick_types" bt
      WHERE m."brick_type_id" = bt."id" AND m."item_id" IS NULL
    `);

    await queryRunner.query(`ALTER TABLE "stock_movements" ALTER COLUMN "item_id" SET NOT NULL`);

    // The balance is keyed on the item now; the old index led with a column
    // that is null on most rows.
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_stock_movements_balance"`);
    await queryRunner.query(`
      CREATE INDEX "idx_stock_movements_balance"
      ON "stock_movements" ("company_id", "warehouse_id", "item_id")
    `);

    // The opening row is one per subject per warehouse, and the subject is the
    // item. The grade index would now refuse a second opening for a warehouse
    // that legitimately has none.
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_stock_movements_opening_grade"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_stock_movements_opening_grade"
      ON "stock_movements" ("warehouse_id", "brick_type_id")
      WHERE "movement_type" = 'opening' AND "brick_type_id" IS NOT NULL AND "deleted_at" IS NULL
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_stock_movements_balance"`);
    await queryRunner.query(`
      CREATE INDEX "idx_stock_movements_balance"
      ON "stock_movements" ("company_id", "warehouse_id", "item_id", "brick_type_id")
    `);

    // Put the grade rows back on the grade-only subject the old CHECK demands.
    await queryRunner.query(`ALTER TABLE "stock_movements" ALTER COLUMN "item_id" DROP NOT NULL`);
    await queryRunner.query(`UPDATE "stock_movements" SET "item_id" = NULL WHERE "brick_type_id" IS NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "stock_movements" ADD CONSTRAINT "chk_stock_movements_one_subject"
      CHECK (("item_id" IS NOT NULL) <> ("brick_type_id" IS NOT NULL))
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "uq_brick_types_item"`);
    await queryRunner.query(`ALTER TABLE "brick_types" DROP CONSTRAINT "fk_brick_types_item_id"`);
    await queryRunner.query(`ALTER TABLE "brick_types" DROP COLUMN "item_id"`);
  }
}
