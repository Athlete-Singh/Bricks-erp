import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P13.3 — a ledger for the owner's own money (ONB-01).
 * Hand-written, never generated (see AGENTS.md).
 *
 * The chart had a Capital **group** and nothing under it. At go-live a kiln
 * enters what it owns — cash, stock, what customers owe — and every one of
 * those is a debit. The credit has nowhere to go, so the opening set can never
 * balance and the first Balance Sheet is wrong by the whole of the owner's
 * investment.
 *
 * Backfilled onto every existing company, the same shape as P8's income
 * ledgers and P10's expense ones.
 */
export class OwnersCapitalLedger1793000000000 implements MigrationInterface {
  name = 'OwnersCapitalLedger1793000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      INSERT INTO "ledgers" ("company_id", "group_id", "code", "name", "is_system")
      SELECT g."company_id", g."id", $1::varchar, $2::varchar, true
        FROM "ledger_groups" g
       WHERE g."code" = 'CAPITAL'
         AND NOT EXISTS (
           SELECT 1 FROM "ledgers" l WHERE l."company_id" = g."company_id" AND l."code" = $1::varchar
         )
      `,
      ['OWNERS_CAPITAL', "Owner's Capital"],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "ledgers" WHERE "code" = 'OWNERS_CAPITAL'`);
  }
}
