import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@prisma';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest() as Request;
    const user = (request as any).user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only SuperAdmin can access this resource');
    }

    return true;
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest() as Request;
    const user = (request as any).user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const allowedRoles = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.ANALYST,
    ];
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        'Only admin panel users can access this resource',
      );
    }

    return true;
  }
}
