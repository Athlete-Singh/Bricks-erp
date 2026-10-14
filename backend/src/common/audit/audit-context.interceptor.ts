import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import type { AuditActorKind } from '@brics/shared';
import type { RequestWithUser } from '../decorators/auth.decorators';
import { auditContext, type AuditContext } from './audit-context';

/**
 * Wraps every handler in an `auditContext.run()` so audit writes inside the
 * handler can be stamped without a parameter at every call site. The context
 * is derived from the JWT — `supportSessionId` is a claim the switch-tenant
 * endpoint adds (S2.1).
 */
@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const supportSessionId = req.user?.supportSessionId ?? null;
    const actorKind: AuditActorKind = supportSessionId ? 'platform_support' : 'user';
    const ctx: AuditContext = { actorKind, supportSessionId };
    return new Observable((subscriber) => {
      auditContext.run(ctx, () => {
        const inner = next.handle().subscribe(subscriber);
        return () => inner.unsubscribe();
      });
    });
  }
}
