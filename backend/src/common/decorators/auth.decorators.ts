import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
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
