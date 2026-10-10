import { BadRequestException, createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);

export interface JwtPayload {
  sub: string;
  email: string | null;
  mobile: string;
  name: string;
  companyId: string;
  roleCode: string;
  permissions: string[];
  isSuperAdmin: boolean;
}

export interface RequestWithUser extends Request {
  user?: JwtPayload;
  companyId?: string;
}

export const CurrentUser = createParamDecorator((data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<RequestWithUser>();
  const user = request.user;
  return data ? user?.[data] : user;
});

export const CurrentCompany = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<RequestWithUser>();
  return request.companyId || request.user?.companyId;
});

/** Matches `idempotency_keys.key`, which is varchar(100). */
export const IDEMPOTENCY_KEY_MAX_LENGTH = 100;

/**
 * SYN-01 — the client-supplied `Idempotency-Key` header (the mobile row UUID).
 * Returns `null` when absent so the service can decide the header is optional
 * for a given endpoint.
 *
 * The length check is the difference between a 400 and an unrecoverable retry
 * loop: an over-long key passes the handler, runs the business write, then
 * fails the key insert with Postgres 22001, rolls the whole transaction back
 * and surfaces as a 500 — which a queued mobile write retries forever. A 400
 * tells the device the request itself is wrong, so it stops.
 */
export const IdempotencyKey = createParamDecorator((_data: unknown, ctx: ExecutionContext): string | null => {
  const request = ctx.switchToHttp().getRequest<Request>();
  const raw = request.header('Idempotency-Key');
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > IDEMPOTENCY_KEY_MAX_LENGTH) {
    throw new BadRequestException(`Idempotency-Key must be at most ${IDEMPOTENCY_KEY_MAX_LENGTH} characters`);
  }
  return trimmed;
});
