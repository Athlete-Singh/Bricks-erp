import { UnauthorizedException, type CallHandler, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import { IS_PUBLIC_KEY, type JwtPayload, type RequestWithUser } from '../../../common/decorators/auth.decorators';
import { SupportSessionInterceptor } from '../support-session.interceptor';
import type { SupportSession } from '../entities/support-session.entity';
import type { SupportSessionService } from '../support-session.service';

const ADMIN_ID = 'admin-1';
const TENANT_ID = 'tenant-1';

describe('SupportSessionInterceptor', () => {
  let interceptor: SupportSessionInterceptor;
  let sessions: jest.Mocked<Pick<SupportSessionService, 'requireById' | 'closeExpired'>>;
  let next: CallHandler;

  const makeCtx = (user: Partial<JwtPayload> | null, isPublic = false): ExecutionContext => {
    const reflector = new Reflector();
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key) => (key === IS_PUBLIC_KEY ? isPublic : undefined));
    const req: Partial<RequestWithUser> = { user: user as JwtPayload };
    interceptor = new SupportSessionInterceptor(reflector, sessions as unknown as SupportSessionService);
    return {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => req as RequestWithUser }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    sessions = { requireById: jest.fn(), closeExpired: jest.fn() };
    next = { handle: jest.fn().mockReturnValue(of('ok')) };
  });

  const run = async (ctx: ExecutionContext) => lastValueFrom(interceptor.intercept(ctx, next));

  it('passes a request through without a support session claim — ordinary business traffic', async () => {
    const ctx = makeCtx({ sub: 'u-1', companyId: 'c-1' });
    await expect(run(ctx)).resolves.toBe('ok');
    expect(sessions.requireById).not.toHaveBeenCalled();
  });

  it('lets a public route through regardless', async () => {
    const ctx = makeCtx(null, true);
    await expect(run(ctx)).resolves.toBe('ok');
  });

  it('refuses an expired session and closes it on the way out', async () => {
    const session = {
      id: 's-1',
      platformUserId: ADMIN_ID,
      companyId: TENANT_ID,
      expiresAt: new Date(Date.now() - 1_000),
      closedAt: null,
    } as SupportSession;
    sessions.requireById.mockResolvedValue(session);
    const ctx = makeCtx({ sub: ADMIN_ID, companyId: TENANT_ID, supportSessionId: 's-1' });

    await expect(run(ctx)).rejects.toThrow(UnauthorizedException);
    expect(sessions.closeExpired).toHaveBeenCalledWith(session);
  });

  it('refuses a session that was already closed', async () => {
    sessions.requireById.mockResolvedValue({
      id: 's-1',
      platformUserId: ADMIN_ID,
      companyId: TENANT_ID,
      expiresAt: new Date(Date.now() + 60_000),
      closedAt: new Date(),
    } as SupportSession);
    const ctx = makeCtx({ sub: ADMIN_ID, companyId: TENANT_ID, supportSessionId: 's-1' });

    await expect(run(ctx)).rejects.toThrow(/closed/);
    expect(sessions.closeExpired).not.toHaveBeenCalled();
  });

  it('refuses a session whose tenant does not match the token', async () => {
    sessions.requireById.mockResolvedValue({
      id: 's-1',
      platformUserId: ADMIN_ID,
      companyId: TENANT_ID,
      expiresAt: new Date(Date.now() + 60_000),
      closedAt: null,
    } as SupportSession);
    const ctx = makeCtx({ sub: ADMIN_ID, companyId: 'another-tenant', supportSessionId: 's-1' });

    await expect(run(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('allows a healthy session', async () => {
    sessions.requireById.mockResolvedValue({
      id: 's-1',
      platformUserId: ADMIN_ID,
      companyId: TENANT_ID,
      expiresAt: new Date(Date.now() + 60_000),
      closedAt: null,
    } as SupportSession);
    const ctx = makeCtx({ sub: ADMIN_ID, companyId: TENANT_ID, supportSessionId: 's-1' });

    await expect(run(ctx)).resolves.toBe('ok');
  });
});
