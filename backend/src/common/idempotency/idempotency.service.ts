import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { EntityManager } from 'typeorm';
import { BusinessRuleException } from '../exceptions/business-rule.exception';
import { IdempotencyKey } from './idempotency-key.entity';

export interface IdempotencyArgs {
  companyId: string;
  userId: string | null;
  /** `METHOD path-pattern`, e.g. `POST /production/batches`. */
  endpoint: string;
  /** The caller-supplied key. Absent header → `null` and `runOnce` just does the work. */
  key: string | null;
  /** The request body — used to detect "same key, different payload" misuse. */
  body: unknown;
}

/**
 * SYN-01 — "a repeat returns the original result instead of inserting again."
 *
 * Like `PostingService` and `StockService`, this works inside the **caller's**
 * `EntityManager`: the key row commits with the business insert in one
 * transaction. A key written but no entity, or an entity with no key, would
 * both be the hole SYN-01 exists to close.
 *
 * The advisory lock on `(companyId, endpoint, key)` serialises two concurrent
 * retries of the same create — without it, both would race past the "existing
 * row?" check and race on the unique insert, and the loser's whole
 * transaction (including the business row) would roll back.
 */
@Injectable()
export class IdempotencyService {
  /**
   * Runs `work` once per key. The returned value is `work`'s return value, or
   * the stored one on replay — the controller never knows the difference.
   */
  async runOnce<T>(manager: EntityManager, args: IdempotencyArgs, work: () => Promise<T>): Promise<T> {
    if (!args.key) {
      return work();
    }
    if (!manager.queryRunner?.isTransactionActive) {
      // Outside a transaction the key row and the business row would land in
      // different commits, and a crash between them would strand one without
      // the other — the exact failure mode SYN-01 is here to prevent.
      throw new BusinessRuleException(
        'IDEMPOTENCY_REQUIRES_TRANSACTION',
        'Idempotent writes must run inside a transaction',
      );
    }

    const hash = hashBody(args.body);
    const lockKey = `idem:${args.companyId}:${args.endpoint}:${args.key}`;
    await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [lockKey]);

    const existing = await manager.findOne(IdempotencyKey, {
      where: { companyId: args.companyId, endpoint: args.endpoint, key: args.key },
    });
    if (existing) {
      if (existing.requestHash !== hash) {
        throw new BusinessRuleException(
          'IDEMPOTENCY_KEY_REUSED',
          'This Idempotency-Key was already used with a different request body',
        );
      }
      return existing.responseBody as T;
    }

    const result = await work();

    await manager.save(
      manager.create(IdempotencyKey, {
        companyId: args.companyId,
        userId: args.userId,
        endpoint: args.endpoint,
        key: args.key,
        requestHash: hash,
        // Every wired endpoint is a POST create, so the replay carries the
        // same 201 Nest returns naturally for the fresh insert. Revisit if a
        // non-POST ever opts in to idempotency.
        responseStatus: 201,
        // JSONB stores plain values; TypeORM / class instances serialise fine via JSON.
        responseBody: JSON.parse(JSON.stringify(result)) as unknown,
      }),
    );

    return result;
  }
}

/** Canonical JSON (sorted keys) → sha-256. A reordered body hashes the same. */
function hashBody(body: unknown): string {
  return createHash('sha256').update(canonicalise(body)).digest('hex');
}

function canonicalise(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value ?? null);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalise).join(',') + ']';
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return '{' + entries.map(([k, v]) => JSON.stringify(k) + ':' + canonicalise(v)).join(',') + '}';
}
