import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from './redis.service';

/**
 * Decorator to enable Redis caching on controller methods
 * Usage: @CacheKey('user:profile', 3600)
 */
export const CacheKey = (key: string, ttl?: number) =>
  SetMetadata('cacheKey', { key, ttl });

/**
 * Redis Cache Interceptor
 * Automatically caches method responses and returns cached data on subsequent calls
 *
 * Usage in controllers:
 * @Get('profile')
 * @CacheKey('user:profile', 3600)
 * async getProfile(@Req() req): Promise<any> {
 *   // This will be cached automatically
 * }
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private redisService: RedisService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const metadata = Reflect.getMetadata('cacheKey', context.getHandler());

    // If no cache key metadata, proceed without caching
    if (!metadata) {
      return next.handle();
    }

    const { key: baseKey, ttl = 3600 } = metadata;

    // Generate cache key with query params and user ID if available
    const cacheKey = this.generateCacheKey(baseKey, request);

    // Try to get from cache
    try {
      const cachedData = await this.redisService.getJson(cacheKey);
      if (cachedData) {
        console.log(`✅ Cache hit for key: ${cacheKey}`);
        return of({
          ...cachedData,
          _cacheHit: true,
          _cacheKey: cacheKey,
        });
      }
    } catch (error: any) {
      console.error(`❌ Cache retrieval error: ${error.message}`);
      // Continue to actual handler if cache fails
    }

    // Not in cache, execute handler and cache the result
    return next.handle().pipe(
      tap(async (data) => {
        try {
          if (data && data.data) {
            // Cache the response data
            await this.redisService.setJson(
              cacheKey,
              {
                ...data.data,
                _cachedAt: new Date().toISOString(),
              },
              ttl,
            );
            console.log(
              `💾 Cached response for key: ${cacheKey} (TTL: ${ttl}s)`,
            );
          }
        } catch (error: any) {
          console.error(`❌ Cache set error: ${error.message}`);
          // Don't fail the request if caching fails
        }
      }),
    );
  }

  private generateCacheKey(baseKey: string, request: any): string {
    const userId = request.user?.id;
    const queryString = JSON.stringify(request.query || {});

    if (userId) {
      return `${baseKey}:${userId}:${queryString}`;
    }
    return `${baseKey}:${queryString}`;
  }
}

/**
 * Cache Invalidation Interceptor
 * Clears cache when POST, PUT, PATCH, DELETE requests are made
 */
@Injectable()
export class InvalidateCacheInterceptor implements NestInterceptor {
  constructor(private redisService: RedisService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const metadata = Reflect.getMetadata(
      'invalidateCache',
      context.getHandler(),
    );

    if (!metadata) {
      return next.handle();
    }

    const { pattern } = metadata;

    return next.handle().pipe(
      tap(async () => {
        try {
          // Get all keys matching pattern and delete them
          const client = this.redisService.getClient();
          const keys = await client.keys(pattern);

          if (keys.length > 0) {
            await this.redisService.deleteMany(keys);
            console.log(
              `🗑️ Invalidated ${keys.length} cache keys matching: ${pattern}`,
            );
          }
        } catch (error: any) {
          console.error(`❌ Cache invalidation error: ${error.message}`);
        }
      }),
    );
  }
}

/**
 * Decorator for cache invalidation
 * Usage: @InvalidateCache('user:profile:*')
 */
export const InvalidateCache = (pattern: string) =>
  SetMetadata('invalidateCache', { pattern });
