import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * NTF-01 — SMS / WhatsApp alerts. Hand-written, never generated (AGENTS.md).
 *
 * `notification_settings` — one row per company: which alerts are on, and the
 * owner's mobile for owner alerts. Everything starts off.
 *
 * `notifications` — the outbox. A row is written in the same transaction as
 * the event (a challan leaving the gate, a receipt, an advance), so an alert
 * exists exactly when the event committed; sending happens afterwards and is
 * retried. One alert per event per source (`uq_notifications_source`), so a
 * replayed request cannot text the customer twice.
 */
export class Notifications1798000000000 implements MigrationInterface {
  name = 'Notifications1798000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notification_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "owner_phone" varchar(20),
        "dispatch_sent" boolean NOT NULL DEFAULT false,
        "payment_received" boolean NOT NULL DEFAULT false,
        "advance_alert" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "pk_notification_settings" PRIMARY KEY ("id"),
        CONSTRAINT "fk_notification_settings_company"
          FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_notification_settings_company" ON "notification_settings" ("company_id")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_notification_settings_company"
        ON "notification_settings" ("company_id") WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "event" varchar(32) NOT NULL,
        "channel" varchar(16) NOT NULL,
        "to_phone" varchar(20) NOT NULL,
        "body" text NOT NULL,
        "variables" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "source_type" varchar(32) NOT NULL,
        "source_id" uuid NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'queued',
        "provider" varchar(16),
        "provider_message_id" varchar(128),
        "error" text,
        "attempts" integer NOT NULL DEFAULT 0,
        "next_attempt_at" TIMESTAMP WITH TIME ZONE,
        "sent_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "pk_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "fk_notifications_company"
          FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "chk_notifications_event"
          CHECK ("event" IN ('dispatch_sent', 'payment_received', 'advance_alert')),
        CONSTRAINT "chk_notifications_channel" CHECK ("channel" IN ('sms', 'whatsapp')),
        CONSTRAINT "chk_notifications_status" CHECK ("status" IN ('queued', 'sent', 'logged', 'failed')),
        CONSTRAINT "chk_notifications_attempts" CHECK ("attempts" >= 0)
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_notifications_company" ON "notifications" ("company_id")`);
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_company_status" ON "notifications" ("company_id", "status", "next_attempt_at")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_notifications_source"
        ON "notifications" ("company_id", "event", "source_id") WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_settings"`);
  }
}
