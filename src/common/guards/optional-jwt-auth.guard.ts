import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional JWT Authentication Guard
 * Uses Passport JWT strategy to validate Bearer tokens if present.
 * If the token is missing or invalid, it does not block the request,
 * but allows it to proceed as an unauthenticated user (guest).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
    status?: any,
  ) {
    // Return user if valid, otherwise return null (do not throw error)
    return user || null;
  }
}
