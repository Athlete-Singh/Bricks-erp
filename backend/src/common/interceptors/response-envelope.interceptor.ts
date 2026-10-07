import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface Paginated<T> {
  items: T[];
  meta: { page: number; limit: number; total: number };
}

function isPaginated(value: unknown): value is Paginated<unknown> {
  return typeof value === 'object' && value !== null && 'items' in value && 'meta' in value;
}

/** Wraps responses: `{ data }`, or `{ data: items, meta }` when a service returns `Paginated`. */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next
      .handle()
      .pipe(map((value: unknown) => (isPaginated(value) ? { data: value.items, meta: value.meta } : { data: value })));
  }
}
