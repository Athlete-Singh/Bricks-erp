import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

/**
 * How far behind the clock a delta watermark is allowed to sit (ADR-034).
 *
 * TypeORM stamps `updated_at` when the UPDATE runs, not when it commits, and
 * Postgres is READ COMMITTED — so a row stamped at T may only become visible
 * at T+d. A watermark of bare `now()` would step straight over that row and it
 * would never be sent again. Lagging the watermark by more than the longest
 * plausible write transaction means the next pull still covers the gap; the
 * only cost is re-sending the rows changed in the last minute, which the
 * device upserts by id anyway.
 */
export const DELTA_WATERMARK_LAG_MS = 60_000;

/** `updated_at` for a live row, `deleted_at` for a tombstone — in Postgres GREATEST ignores NULLs. */
const STAMP = (alias: string) => `GREATEST(${alias}.updated_at, ${alias}.deleted_at)`;

/**
 * SYN-02 — teach any list query builder to answer a delta pull.
 *
 * When `since` is set we must return two kinds of row:
 *   - rows whose stamp is at or after `since` (new or edited), and
 *   - rows whose `deleted_at` is at or after `since` (tombstones so the
 *     mobile can delete locally too — a soft-deleted row never surfaces
 *     through the normal list, so without this it would stay forever on the
 *     field device).
 *
 * `.withDeleted()` is required because TypeORM's soft-delete otherwise
 * silently removes the tombstones from the result.
 *
 * The window is inclusive and the order is the stamp, because the two together
 * are what make paging safe: the client's next `since` is a stamp it has
 * already seen, and at millisecond resolution several rows share it. Ordering
 * by anything else (created_at, name, activity) would let page 1 report a
 * watermark that skips every changed row waiting on page 2. `id` breaks ties so
 * the order is total, not merely non-decreasing.
 *
 * Returns whether the query is a delta, so callers can skip the filters and
 * the sort that only make sense for a human looking at a list.
 */
export function applySince<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  since: string | undefined,
): boolean {
  if (!since) return false;
  qb.withDeleted();
  qb.andWhere(`${STAMP(alias)} >= :since`, { since });
  qb.orderBy(STAMP(alias), 'ASC').addOrderBy(`${alias}.id`, 'ASC');
  return true;
}

export type WithTombstone<T> = T & { deleted: boolean };

export interface DeltaRow {
  updatedAt: Date;
  deletedAt?: Date | null;
}

export function withTombstone<T extends { deletedAt?: Date | null }>(row: T): WithTombstone<T> {
  return { ...row, deleted: row.deletedAt != null };
}

/** The JS twin of `STAMP` — the moment the client last needed to know about. */
export function deltaStamp(row: DeltaRow): Date {
  const deleted = row.deletedAt;
  return deleted != null && deleted > row.updatedAt ? deleted : row.updatedAt;
}

/**
 * The value the client must echo back as its next `since`.
 *
 * Two things cap it. The lag (above) covers rows stamped but not yet
 * committed. The last row of a partial page caps it again, because the rows
 * after it have not been sent yet and a watermark past them would lose the
 * rest of the page set. Never earlier than the `since` we were given, so a
 * device that syncs often does not walk backwards.
 */
export function deltaWatermark(since: string, rows: DeltaRow[], hasMore: boolean): string {
  const safe = Math.max(Date.now() - DELTA_WATERMARK_LAG_MS, Date.parse(since));
  const last = rows[rows.length - 1];
  if (!hasMore || last === undefined) return new Date(safe).toISOString();
  return new Date(Math.min(safe, deltaStamp(last).getTime())).toISOString();
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
}

export type DeltaPageMeta = PageMeta & { nextSince?: string };

/** `meta` for a paginated list: the usual counters, plus the watermark on a delta. */
export function deltaMeta(base: PageMeta, since: string | undefined, rows: DeltaRow[]): DeltaPageMeta {
  if (!since) return base;
  return { ...base, nextSince: deltaWatermark(since, rows, base.page * base.limit < base.total) };
}
