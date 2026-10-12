import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P9.1b — the transport cost path (VEH-02…07). Hand-written, never generated
 * (see AGENTS.md).
 *
 * Two tables. Unlike dispatch, nothing here moves bricks: these are journals,
 * plus the one stock exception where diesel is drawn from the kiln's own tank
 * (ADR-043) and so posts no journal at all.
 *
 * The CHECKs carry the rules the service also enforces: freight is charged to
 * somebody or not charged at all; a charge is paid now **or** owed, never both;
 * fuel from the tank is a stock event with no voucher, and everything else is a
 * voucher with no stock.
 */
export class TransportOps1792600000000 implements MigrationInterface {
  name = 'TransportOps1792600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "vehicle_trips" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "trip_no" varchar(30) NOT NULL,
        "vehicle_id" uuid NOT NULL,
        "driver_id" uuid,
        "dispatch_id" uuid,
        "site_id" uuid NOT NULL,
        "trip_date" date NOT NULL,
        "route_from" varchar(200),
        "route_to" varchar(200),
        "distance_km" numeric(18,3),
        "freight_amount" numeric(18,2),
        "freight_party_id" uuid,
        "voucher_id" uuid,
        "notes" text,
        CONSTRAINT "pk_vehicle_trips" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "vehicle_expenses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "vehicle_id" uuid NOT NULL,
        "trip_id" uuid,
        "site_id" uuid NOT NULL,
        "kind" varchar(20) NOT NULL,
        "expense_date" date NOT NULL,
        "amount" numeric(18,2) NOT NULL,
        "quantity" numeric(18,3),
        "paid_from_ledger_id" uuid,
        "party_id" uuid,
        "item_id" uuid,
        "warehouse_id" uuid,
        "stock_movement_id" uuid,
        "voucher_id" uuid,
        "reference" varchar(80),
        "notes" text,
        CONSTRAINT "pk_vehicle_expenses" PRIMARY KEY ("id")
      )
    `);

    // ── rules the database keeps on its own ──────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "vehicle_trips" ADD CONSTRAINT "chk_trips_freight_is_charged_to_someone"
      CHECK (("freight_amount" IS NULL AND "freight_party_id" IS NULL AND "voucher_id" IS NULL)
          OR ("freight_amount" > 0 AND "freight_party_id" IS NOT NULL AND "voucher_id" IS NOT NULL))
    `);
    await queryRunner.query(`
      ALTER TABLE "vehicle_trips" ADD CONSTRAINT "chk_trips_distance_positive"
      CHECK ("distance_km" IS NULL OR "distance_km" > 0)
    `);
    await queryRunner.query(`
      ALTER TABLE "vehicle_expenses" ADD CONSTRAINT "chk_vehicle_expenses_kind"
      CHECK ("kind" IN ('diesel','maintenance','loading','hire'))
    `);
    await queryRunner.query(`
      ALTER TABLE "vehicle_expenses" ADD CONSTRAINT "chk_vehicle_expenses_amount_positive"
      CHECK ("amount" > 0 AND ("quantity" IS NULL OR "quantity" > 0))
    `);
    // Paid on the spot or owed to somebody — never both, and never neither.
    // Fuel from the kiln's own tank is the exception: already paid for on its
    // purchase bill, so it carries no payment at all.
    await queryRunner.query(`
      ALTER TABLE "vehicle_expenses" ADD CONSTRAINT "chk_vehicle_expenses_paid_or_owed"
      CHECK (
        ("warehouse_id" IS NOT NULL AND "paid_from_ledger_id" IS NULL AND "party_id" IS NULL)
        OR ("warehouse_id" IS NULL AND (("paid_from_ledger_id" IS NOT NULL) <> ("party_id" IS NOT NULL)))
      )
    `);
    // ADR-043: fuel from the tank is a stock event with no journal; everything
    // else is a journal with no stock. The two never mix on one row.
    await queryRunner.query(`
      ALTER TABLE "vehicle_expenses" ADD CONSTRAINT "chk_vehicle_expenses_stock_xor_voucher"
      CHECK (
        ("warehouse_id" IS NOT NULL AND "item_id" IS NOT NULL AND "quantity" IS NOT NULL
          AND "stock_movement_id" IS NOT NULL AND "voucher_id" IS NULL AND "kind" = 'diesel')
        OR ("warehouse_id" IS NULL AND "item_id" IS NULL
          AND "stock_movement_id" IS NULL AND "voucher_id" IS NOT NULL)
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_vehicle_trips_company_no" ON "vehicle_trips" ("company_id", "trip_no") WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_vehicle_trips_date" ON "vehicle_trips" ("company_id", "trip_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_vehicle_expenses_date" ON "vehicle_expenses" ("company_id", "expense_date")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_vehicle_expenses_trip" ON "vehicle_expenses" ("trip_id")`);

    // ── company scope and the ids a request body may point at (ADR-021) ───────
    await queryRunner.query(`CREATE INDEX "idx_vehicle_trips_company" ON "vehicle_trips" ("company_id")`);
    await queryRunner.query(`
      ALTER TABLE "vehicle_trips" ADD CONSTRAINT "fk_vehicle_trips_company"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`CREATE INDEX "idx_vehicle_expenses_company" ON "vehicle_expenses" ("company_id")`);
    await queryRunner.query(`
      ALTER TABLE "vehicle_expenses" ADD CONSTRAINT "fk_vehicle_expenses_company"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT
    `);

    for (const [table, column, ref, refCol] of [
      ['vehicle_trips', 'vehicle_id', 'transport_vehicles', 'id'],
      ['vehicle_trips', 'driver_id', 'transport_drivers', 'id'],
      ['vehicle_trips', 'dispatch_id', 'dispatches', 'id'],
      ['vehicle_trips', 'site_id', 'sites', 'id'],
      ['vehicle_trips', 'freight_party_id', 'parties', 'id'],
      ['vehicle_trips', 'voucher_id', 'vouchers', 'id'],
      ['vehicle_expenses', 'vehicle_id', 'transport_vehicles', 'id'],
      ['vehicle_expenses', 'trip_id', 'vehicle_trips', 'id'],
      ['vehicle_expenses', 'site_id', 'sites', 'id'],
      ['vehicle_expenses', 'paid_from_ledger_id', 'ledgers', 'id'],
      ['vehicle_expenses', 'party_id', 'parties', 'id'],
      ['vehicle_expenses', 'item_id', 'items', 'id'],
      ['vehicle_expenses', 'warehouse_id', 'warehouses', 'id'],
      ['vehicle_expenses', 'stock_movement_id', 'stock_movements', 'id'],
      ['vehicle_expenses', 'voucher_id', 'vouchers', 'id'],
    ] as const) {
      await queryRunner.query(`
        ALTER TABLE "${table}" ADD CONSTRAINT "fk_${table}_${column}"
        FOREIGN KEY ("${column}") REFERENCES "${ref}"("${refCol}") ON DELETE RESTRICT
      `);
    }

    // Fuel issued to a vehicle is its own kind of movement. It is not an
    // 'adjustment': adjustments are reasoned corrections that may drive stock
    // negative (ADR-026), and a routine fuel issue is neither.
    await queryRunner.query(`ALTER TABLE "stock_movements" DROP CONSTRAINT "chk_stock_movements_type"`);
    await queryRunner.query(`
      ALTER TABLE "stock_movements" ADD CONSTRAINT "chk_stock_movements_type"
      CHECK ("movement_type" IN ('opening','purchase','production','sale','dispatch','vehicle_fuel','wastage','adjustment','transfer'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "chk_stock_movements_type"`);
    await queryRunner.query(`
      ALTER TABLE "stock_movements" ADD CONSTRAINT "chk_stock_movements_type"
      CHECK ("movement_type" IN ('opening','purchase','production','sale','dispatch','wastage','adjustment','transfer'))
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "vehicle_expenses"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vehicle_trips"`);
  }
}
