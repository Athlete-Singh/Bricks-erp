import { AsyncLocalStorage } from 'node:async_hooks';
import type { AuditActorKind } from '@brics/shared';

/**
 * S2.1 — a request's audit context, carried across every `await` by Node's
 * AsyncLocalStorage. The alternative was threading an actor-kind parameter
 * through every `AuditService.record` caller — a change of hundreds of
 * lines across every module, and one each new call would forget. ALS keeps
 * the concern in one place.
 *
 * The interceptor sets the context from `req.user` once per request; the
 * audit service reads it when it writes. An explicit field on the event
 * still wins, which is what the service's `system` writes rely on.
 */
export interface AuditContext {
  actorKind: AuditActorKind;
  supportSessionId: string | null;
}

export const auditContext = new AsyncLocalStorage<AuditContext>();

export function currentAuditContext(): AuditContext {
  return auditContext.getStore() ?? { actorKind: 'user', supportSessionId: null };
}
