import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { USER_TYPES_KEY } from '@/common/decorators/user-types.decorator';

@Injectable()
export class UserTypesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredUserTypes = this.reflector.getAllAndOverride<string[]>(
      USER_TYPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no user types are required, allow access
    if (!requiredUserTypes || requiredUserTypes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const hasRequiredType = requiredUserTypes.includes(user.userType);

    if (!hasRequiredType) {
      throw new ForbiddenException(
        `This action requires one of these user types: ${requiredUserTypes.join(', ')}`,
      );
    }

    return true;
  }
}
