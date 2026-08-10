// src/core/guards/auth-throttler.guard.ts
import {
  Injectable,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import {
  ThrottlerGuard,
  ThrottlerException,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

export const THROTTLE_SKIP_KEY = 'throttle_skip';
export const THROTTLE_CONFIG_KEY = 'throttle_config';

export interface CustomThrottleConfig {
  limit: number;
  ttl: number;
  name?: string;
  blockDuration?: number;
}

@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  constructor(
    @Inject('THROTTLER_OPTIONS')
    protected readonly options: ThrottlerModuleOptions,
    @Inject('THROTTLER_STORAGE')
    protected readonly storageService: ThrottlerStorage,
    protected readonly reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if throttling should be skipped
    const skipThrottle = this.reflector.getAllAndOverride<boolean>(
      THROTTLE_SKIP_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipThrottle) {
      return true;
    }

    // Get custom throttle configuration
    const customConfig = this.reflector.getAllAndOverride<CustomThrottleConfig>(
      THROTTLE_CONFIG_KEY,
      [context.getHandler(), context.getClass()],
    );

    try {
      if (customConfig) {
        return await this.handleCustomThrottle(context, customConfig);
      }
      return await super.canActivate(context);
    } catch (error) {
      if (error instanceof ThrottlerException) {
        const ttl = customConfig?.ttl || 60000;

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests',
            error: 'Too Many Requests',
            retryAfter: Math.ceil(ttl / 1000),
            details: error.message,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw error;
    }
  }

  private async handleCustomThrottle(
    context: ExecutionContext,
    config: CustomThrottleConfig,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const key = this.generateCustomKey(context, request, config);

    const { totalHits } = await this.storageService.increment(
      key,
      config.ttl,
      config.limit,
      config.blockDuration || config.ttl,
      'default',
    );

    if (totalHits > config.limit) {
      throw new ThrottlerException(
        `Rate limit exceeded. Please try again in ${Math.ceil(config.ttl / 1000)} seconds.`,
      );
    }

    return true;
  }

  protected generateCustomKey(
    context: ExecutionContext,
    request: Request,
    config: CustomThrottleConfig,
  ): string {
    const routeName = context.getHandler().name;
    const ip = request.ip || request.socket.remoteAddress;

    // For auth endpoints, include email/username
    const body = request.body as any;
    const identifier =
      body?.email || body?.username || (request as any).user?.id || ip;

    return `${config.name || routeName}:${identifier}`;
  }

  protected getTracker(req: Request): Promise<string> {
    return Promise.resolve(req.ip || req.socket.remoteAddress || 'unknown');
  }
}
