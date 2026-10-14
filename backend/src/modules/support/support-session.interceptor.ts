import { CallHandler, ExecutionContext, Injectable, NestInterceptor, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from, mergeMap } from 'rxjs';
import { IS_PUBLIC_KEY, type RequestWithUser } from '../../common/decorators/auth.decorators';
import { SupportSessionService } from './support-session.service';

/**
 * S2.1 — every request carrying a `supportSessionId` claim passes through
 * here. A session that is past its window is closed on the spot and the
 * request is refused with 401, so an operator with an abandoned tab cannot
 * keep acting on a tenant after the window has elapsed.
 *
 * Must run after JwtAuthGuard (which populates `req.user`), so it is an
 * interceptor, not a guard — guards run before controller-scoped guards and
 * cannot read `req.user` yet.
 */
@Injectable()
export class SupportSessionInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private sessions: SupportSessionService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return next.handle();

    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const sessionId = req.user?.supportSessionId;
    if (!sessionId) return next.handle();

    return from(this.validate(req, sessionId)).pipe(mergeMap(() => next.handle()));
  }

  private async validate(req: RequestWithUser, sessionId: string): Promise<void> {
    let session;
    try {
      session = await this.sessions.requireById(sessionId);
    } catch {
      throw new UnauthorizedException('Support session no longer exists');
    }

    if (session.closedAt) {
      throw new UnauthorizedException('Support session has been closed — open a new one');
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      await this.sessions.closeExpired(session);
      throw new UnauthorizedException('Support session has expired — open a new one');
    }
    if (session.platformUserId !== req.user?.sub) {
      throw new UnauthorizedException('Support session does not belong to this user');
    }
    if (session.companyId !== req.user?.companyId) {
      throw new UnauthorizedException('Support session does not match the request tenant');
    }
  }
}
