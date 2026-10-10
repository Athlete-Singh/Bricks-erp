import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SYN-02 — a revoked site grant has to leave a trace.
 *
 * `replaceSiteAccess` used to DELETE the rows it no longer wanted, so a
 * revocation was invisible: the kiln simply stopped appearing in that user's
 * delta and the device kept showing it — and kept accepting production against
 * it — forever. A revocation timestamp lets the delta send a tombstone, which
 * is the only message a device acts on.
 *
 * The row is kept and stamped rather than deleted, so re-granting reuses it and
 * the `(user_id, site_id)` unique key still holds.
 *
 * Hand-written, never generated (see AGENTS.md).
 */
export class UserSiteRevocation1792100000000 implements MigrationInterface {
  name = 'UserSiteRevocation1792100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_sites" ADD COLUMN IF NOT EXISTS "revoked_at" TIMESTAMP WITH TIME ZONE
    `);
    // Every read of a live grant filters on this, and the delta reads it by
    // (user, revoked_at) — both are covered by the existing user index plus this.
    await queryRunner.query(`
      CREATE INDEX "idx_user_sites_user_revoked" ON "user_sites" ("user_id", "revoked_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_sites_user_revoked"`);
    await queryRunner.query(`ALTER TABLE "user_sites" DROP COLUMN IF EXISTS "revoked_at"`);
  }
}
