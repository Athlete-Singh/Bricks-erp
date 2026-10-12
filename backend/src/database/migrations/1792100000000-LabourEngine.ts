import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P6.1 — Labour & Sardar Engine (LAB-01…08, LEK-03).
 *
 * Hand-written, never generated (see AGENTS.md).
 */
export class LabourEngine1792100000000 implements MigrationInterface {
  name = 'LabourEngine1792100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. labour_groups
    await queryRunner.query(`
      CREATE TABLE "labour_groups" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "site_id" uuid,
        "sardar_party_id" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "activity" varchar(50) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "pk_labour_groups" PRIMARY KEY ("id")
      )
    `);

    // 2. workers
    await queryRunner.query(`
      CREATE TABLE "workers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "labour_group_id" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "phone" varchar(20),
        "daily_wage_rate" numeric(18,2),
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "pk_workers" PRIMARY KEY ("id")
      )
    `);

    // 3. labour_attendance
    await queryRunner.query(`
      CREATE TABLE "labour_attendance" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "site_id" uuid NOT NULL,
        "date" date NOT NULL,
        "labour_group_id" uuid NOT NULL,
        "worker_id" uuid,
        "status" varchar(20) NOT NULL,
        "overtime_hours" numeric(5,2) NOT NULL DEFAULT 0.00,
        "remarks" varchar(255),
        CONSTRAINT "pk_labour_attendance" PRIMARY KEY ("id")
      )
    `);

    // 4. labour_advances
    await queryRunner.query(`
      CREATE TABLE "labour_advances" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "site_id" uuid NOT NULL,
        "fy_id" uuid NOT NULL,
        "sardar_party_id" uuid NOT NULL,
        "worker_id" uuid,
        "date" date NOT NULL,
        "amount" numeric(18,2) NOT NULL,
        "payment_mode" varchar(20) NOT NULL,
        "cash_bank_ledger_id" uuid NOT NULL,
        "voucher_id" uuid,
        "remarks" varchar(255),
        CONSTRAINT "pk_labour_advances" PRIMARY KEY ("id")
      )
    `);

    // 5. labour_deductions
    await queryRunner.query(`
      CREATE TABLE "labour_deductions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "site_id" uuid NOT NULL,
        "sardar_party_id" uuid NOT NULL,
        "worker_id" uuid,
        "date" date NOT NULL,
        "category" varchar(50) NOT NULL,
        "amount" numeric(18,2) NOT NULL,
        "remarks" varchar(255),
        CONSTRAINT "pk_labour_deductions" PRIMARY KEY ("id")
      )
    `);

    // 6. labour_settlements
    await queryRunner.query(`
      CREATE TABLE "labour_settlements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "company_id" uuid NOT NULL,
        "site_id" uuid NOT NULL,
        "fy_id" uuid NOT NULL,
        "sardar_party_id" uuid NOT NULL,
        "period_from" date NOT NULL,
        "period_to" date NOT NULL,
        "gross_wages" numeric(18,2) NOT NULL,
        "advances_recovered" numeric(18,2) NOT NULL,
        "deductions" numeric(18,2) NOT NULL,
        "net_payable" numeric(18,2) NOT NULL,
        "status" varchar(20) NOT NULL,
        "voucher_id" uuid,
        "remarks" varchar(255),
        CONSTRAINT "pk_labour_settlements" PRIMARY KEY ("id")
      )
    `);

    // CHECK CONSTRAINTS
    await queryRunner.query(
      `ALTER TABLE "labour_attendance" ADD CONSTRAINT "chk_attendance_status" CHECK ("status" IN ('present', 'half_day', 'absent'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "labour_advances" ADD CONSTRAINT "chk_advance_amount_positive" CHECK ("amount" > 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "labour_advances" ADD CONSTRAINT "chk_advance_payment_mode" CHECK ("payment_mode" IN ('cash', 'bank', 'upi'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "labour_deductions" ADD CONSTRAINT "chk_deduction_amount_positive" CHECK ("amount" > 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "labour_deductions" ADD CONSTRAINT "chk_deduction_category" CHECK ("category" IN ('advance_recovery', 'khurak', 'loan_instalment', 'fine'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "labour_settlements" ADD CONSTRAINT "chk_settlement_status" CHECK ("status" IN ('draft', 'posted', 'paid'))`,
    );

    // UNIQUE INDEXES
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_labour_groups_company_name" ON "labour_groups" ("company_id", lower("name")) WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_labour_attendance_company_date" ON "labour_attendance" ("company_id", "date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_labour_advances_company_sardar" ON "labour_advances" ("company_id", "sardar_party_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_labour_deductions_company_sardar" ON "labour_deductions" ("company_id", "sardar_party_id")`,
    );

    // FOREIGN KEYS
    await queryRunner.query(
      `ALTER TABLE "labour_groups" ADD CONSTRAINT "fk_labour_groups_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "labour_groups" ADD CONSTRAINT "fk_labour_groups_sardar" FOREIGN KEY ("sardar_party_id") REFERENCES "parties"("id") ON DELETE RESTRICT`,
    );
    await queryRunner.query(
      `ALTER TABLE "workers" ADD CONSTRAINT "fk_workers_group" FOREIGN KEY ("labour_group_id") REFERENCES "labour_groups"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "labour_attendance" ADD CONSTRAINT "fk_attendance_group" FOREIGN KEY ("labour_group_id") REFERENCES "labour_groups"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "labour_advances" ADD CONSTRAINT "fk_advances_sardar" FOREIGN KEY ("sardar_party_id") REFERENCES "parties"("id") ON DELETE RESTRICT`,
    );
    await queryRunner.query(
      `ALTER TABLE "labour_deductions" ADD CONSTRAINT "fk_deductions_sardar" FOREIGN KEY ("sardar_party_id") REFERENCES "parties"("id") ON DELETE RESTRICT`,
    );
    await queryRunner.query(
      `ALTER TABLE "labour_settlements" ADD CONSTRAINT "fk_settlements_sardar" FOREIGN KEY ("sardar_party_id") REFERENCES "parties"("id") ON DELETE RESTRICT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "labour_settlements"`);
    await queryRunner.query(`DROP TABLE "labour_deductions"`);
    await queryRunner.query(`DROP TABLE "labour_advances"`);
    await queryRunner.query(`DROP TABLE "labour_attendance"`);
    await queryRunner.query(`DROP TABLE "workers"`);
    await queryRunner.query(`DROP TABLE "labour_groups"`);
  }
}
