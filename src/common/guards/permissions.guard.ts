import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MODULE_KEY } from '@/common/decorators/require-module.decorator';
import { UserRole } from '@prisma';

/**
 * PermissionsGuard — module access control.
 *
 * Rules:
 *   - No @RequireModule -> guard is a no-op (route is unguarded).
 *   - SUPER_ADMIN -> always allowed.
 *   - ADMIN -> allowed.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const module = this.reflector.getAllAndOverride<string>(MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No decorator attached — route is unguarded
    if (!module) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) {
      return true;
    }

    throw new ForbiddenException(
      `Role [${user.role}] does not have access to module [${module}]`,
    );
  }
}
