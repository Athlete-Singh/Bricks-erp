import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface Paginated<T> {
  items: T[];
  meta: { page: number; limit: number; total: number };
}

/**
 * Anything a service hands back as rows plus side-band facts. `meta` is open
 * because a delta pull (SYN-02) carries `nextSince` there, and the sites delta
 * carries nothing else — it is not paginated.
 */
export interface Enveloped<T> {
  items: T[];
  meta: Record<string, unknown>;
}

function isEnveloped(value: unknown): value is Enveloped<unknown> {
  return typeof value === 'object' && value !== null && 'items' in value && 'meta' in value;
}

/** Wraps responses: `{ data }`, or `{ data: items, meta }` when a service returns rows plus `meta`. */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next
      .handle()
      .pipe(map((value: unknown) => (isEnveloped(value) ? { data: value.items, meta: value.meta } : { data: value })));
  }
}
