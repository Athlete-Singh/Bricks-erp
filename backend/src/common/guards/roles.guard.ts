import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, PERMISSIONS_KEY, type RequestWithUser } from '../decorators/auth.decorators';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('User context missing');
    }

    // S1.1 — the `isSuperAdmin` blanket bypass is gone. A platform admin reaches
    // business endpoints only via a support session (S2); every other request
    // is decided by the user's permissions, so a platform operator cannot read
    // a tenant's books by accident. See ADR-052.
    const userPermissions = user.permissions || [];
    const hasAll = requiredPermissions.every((perm) => userPermissions.includes(perm));
    if (!hasAll) {
      throw new ForbiddenException(`Missing required permission: ${requiredPermissions.join(', ')}`);
    }

    return true;
  }
}
