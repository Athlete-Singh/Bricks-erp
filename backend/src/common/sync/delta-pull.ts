import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

/**
 * SYN-02 — teach any list query builder to answer a delta pull.
 *
 * When `since` is set we must return two kinds of row:
 *   - rows whose `updated_at` is strictly after `since` (new or edited), and
 *   - rows whose `deleted_at` is strictly after `since` (tombstones so the
 *     mobile can delete locally too — a soft-deleted row never surfaces
 *     through the normal list, so without this it would stay forever on the
 *     field device).
 *
 * `.withDeleted()` is required because TypeORM's soft-delete otherwise
 * silently removes the tombstones from the result.
 *
 * The response mapper then adds a `deleted` flag per row so the mobile does
 * not need to inspect `deletedAt`. Active rows carry `deleted: false`.
 */
export function applySince<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  since: string | undefined,
): void {
  if (!since) return;
  qb.withDeleted();
  qb.andWhere(`(${alias}.updated_at > :since OR ${alias}.deleted_at > :since)`, { since });
}

export type WithTombstone<T> = T & { deleted: boolean };

export function withTombstone<T extends { deletedAt?: Date | null }>(row: T): WithTombstone<T> {
  return { ...row, deleted: row.deletedAt != null };
}
