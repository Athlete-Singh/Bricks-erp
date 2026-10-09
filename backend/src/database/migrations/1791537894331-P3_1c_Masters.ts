import { MigrationInterface, QueryRunner } from 'typeorm';

export class P31cMasters1791537894331 implements MigrationInterface {
  name = 'P31cMasters1791537894331';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "transport_vehicles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_by" uuid, "company_id" uuid NOT NULL, "deleted_at" TIMESTAMP WITH TIME ZONE, "registration_no" character varying(50) NOT NULL, "type" character varying(20) NOT NULL, "owner_type" character varying(20) NOT NULL, "party_id" uuid, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_0976841dd3c11f363a16faf1a44" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_2b7df945808fddefb65ade388c" ON "transport_vehicles" ("party_id") `);
    await queryRunner.query(
      `CREATE TABLE "transport_drivers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_by" uuid, "company_id" uuid NOT NULL, "deleted_at" TIMESTAMP WITH TIME ZONE, "name" character varying(100) NOT NULL, "phone" character varying(20), "license_no" character varying(50), "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_feddd980c16638feebb3a91dbad" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "tax_hsn_rates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_by" uuid, "company_id" uuid NOT NULL, "deleted_at" TIMESTAMP WITH TIME ZONE, "hsn_code" character varying(20) NOT NULL, "description" character varying(255), "cgst_rate" numeric(5,2) NOT NULL DEFAULT '0', "sgst_rate" numeric(5,2) NOT NULL DEFAULT '0', "igst_rate" numeric(5,2) NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_9180525e9bc87289e679caed26b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "labour_wage_rates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_by" uuid, "company_id" uuid NOT NULL, "deleted_at" TIMESTAMP WITH TIME ZONE, "activity" character varying(50) NOT NULL, "unit" character varying(50) NOT NULL, "rate_amount" numeric(18,2) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_3db6d43d1a0f950ecde16cb4634" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "labour_wage_rates"`);
    await queryRunner.query(`DROP TABLE "tax_hsn_rates"`);
    await queryRunner.query(`DROP TABLE "transport_drivers"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2b7df945808fddefb65ade388c"`);
    await queryRunner.query(`DROP TABLE "transport_vehicles"`);
  }
}
