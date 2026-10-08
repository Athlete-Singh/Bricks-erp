import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantGuard } from '../tenant.guard';
import type { JwtPayload, RequestWithUser } from '../../decorators/auth.decorators';

describe('TenantGuard', () => {
  let guard: TenantGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new TenantGuard(reflector);
  });

  const createMockContext = (userPayload: Partial<JwtPayload> | null, isPublic = false): ExecutionContext => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(isPublic);
    const req: Partial<RequestWithUser> = { user: userPayload as JwtPayload, companyId: undefined };
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => req as RequestWithUser,
      }),
    } as unknown as ExecutionContext;
  };

  it('should allow public routes', () => {
    const ctx = createMockContext(null, true);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should throw ForbiddenException if user context is missing companyId', () => {
    const ctx = createMockContext({});
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should attach companyId to request and return true for valid user context', () => {
    const ctx = createMockContext({ companyId: 'company-uuid-123' });
    const req = ctx.switchToHttp().getRequest<RequestWithUser>();
    expect(guard.canActivate(ctx)).toBe(true);
    expect(req.companyId).toBe('company-uuid-123');
  });
});
