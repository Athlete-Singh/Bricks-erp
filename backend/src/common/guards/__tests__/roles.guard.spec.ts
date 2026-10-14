import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  IS_PUBLIC_KEY,
  PERMISSIONS_KEY,
  type JwtPayload,
  type RequestWithUser,
} from '../../decorators/auth.decorators';
import { RolesGuard } from '../roles.guard';

/**
 * S1.1 — these tests pin the invariant from ADR-052: `isSuperAdmin` is no longer
 * a get-past-the-guard switch. The guard is permission-based, full stop. If a
 * platform admin needs business access, S2's support session is the way.
 */
describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  const makeContext = (user: Partial<JwtPayload> | null): ExecutionContext => {
    const req: Partial<RequestWithUser> = { user: user as JwtPayload };
    return {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => req as RequestWithUser }),
    } as unknown as ExecutionContext;
  };

  const reflectorFor = (ctx: ExecutionContext, isPublic: boolean, required: string[] | null) => {
    const reflector = (guard as unknown as { reflector: Reflector }).reflector;
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((metadataKey: unknown) => {
      if (metadataKey === IS_PUBLIC_KEY) return isPublic;
      if (metadataKey === PERMISSIONS_KEY) return required;
      return undefined;
    });
    return ctx;
  };

  afterEach(() => jest.restoreAllMocks());

  it('allows a public route regardless of permissions', () => {
    const ctx = reflectorFor(makeContext(null), true, null);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows a route that requires no permissions', () => {
    const ctx = reflectorFor(makeContext({ permissions: [] }), false, []);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('refuses a super-admin who does NOT hold the required permission — the bypass is gone (ADR-052)', () => {
    const user = { isSuperAdmin: true, permissions: [] } as unknown as JwtPayload;
    const ctx = reflectorFor(makeContext(user), false, ['sales.manage']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows a user who holds every required permission', () => {
    const user = { isSuperAdmin: false, permissions: ['sales.view', 'sales.manage'] } as unknown as JwtPayload;
    const ctx = reflectorFor(makeContext(user), false, ['sales.manage']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('refuses a platform admin reaching a business endpoint — no business permissions, no access', () => {
    const user = {
      isSuperAdmin: false,
      permissions: ['platform.tenants.view', 'platform.tenants.manage'],
    } as unknown as JwtPayload;
    const ctx = reflectorFor(makeContext(user), false, ['accounts.view']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
