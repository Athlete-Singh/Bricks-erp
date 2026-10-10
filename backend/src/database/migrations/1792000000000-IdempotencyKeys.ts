import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P5.1c — SYN-01 `Idempotency-Key` storage.
 *
 * The mobile app resends queued creates when the network returns. Without a
 * seen-this-already table, one retry becomes two production entries, two
 * GRNs, two dispatches. The key is tenant-scoped: a device belongs to one
 * company, and if two companies happen to pick the same UUID (unlikely but
 * cheap to defend) they do not stomp on each other.
 *
 * Hand-written, never generated (see AGENTS.md).
 */
export class IdempotencyKeys1792000000000 implements MigrationInterface {
  name = 'IdempotencyKeys1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "idempotency_keys" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "company_id" uuid NOT NULL,
        "user_id" uuid,
        "key" varchar(100) NOT NULL,
        "endpoint" varchar(120) NOT NULL,
        "request_hash" char(64) NOT NULL,
        "response_status" smallint NOT NULL,
        "response_body" jsonb NOT NULL,
        CONSTRAINT "pk_idempotency_keys" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "idempotency_keys" ADD CONSTRAINT "chk_idempotency_keys_key_nonblank"
      CHECK (length(btrim("key")) > 0)
    `);
    await queryRunner.query(`
      ALTER TABLE "idempotency_keys" ADD CONSTRAINT "chk_idempotency_keys_status"
      CHECK ("response_status" BETWEEN 100 AND 599)
    `);

    // One key per (company, endpoint). A naive unique on just (company, key)
    // would wrongly collide across endpoints that happen to share a client UUID.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_idempotency_keys_company_endpoint_key"
      ON "idempotency_keys" ("company_id", "endpoint", "key")
    `);
    await queryRunner.query(`CREATE INDEX "idx_idempotency_keys_created" ON "idempotency_keys" ("created_at")`);

    await queryRunner.query(`
      ALTER TABLE "idempotency_keys" ADD CONSTRAINT "fk_idempotency_keys_company_id"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "idempotency_keys"`);
  }
}
