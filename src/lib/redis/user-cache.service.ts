import { Injectable } from '@nestjs/common';
import { OtpType } from '@prisma';
import { RedisService } from '../redis/redis.service';

/**
 * User Cache Service
 * Handles all Redis caching operations for user-related data
 */
@Injectable()
export class UserCacheService {
  // Cache key prefixes
  private readonly USER_CACHE_PREFIX = 'user:';
  private readonly USER_SESSION_PREFIX = 'user:session:';
  private readonly USER_OTP_PREFIX = 'user:otp:';
  private readonly USER_EMAIL_PREFIX = 'user:email:';

  // Default TTL in seconds (1 hour)
  private readonly DEFAULT_TTL = 3600;
  // OTP TTL (10 minutes)
  private readonly OTP_TTL = 600;
  // Session TTL (24 hours)
  private readonly SESSION_TTL = 86400;

  constructor(private redisService: RedisService) {}

  /**
   * Cache user profile
   */
  async cacheUserProfile(
    userId: string,
    userData: any,
    ttl = this.DEFAULT_TTL,
  ): Promise<void> {
    const key = `${this.USER_CACHE_PREFIX}${userId}`;
    await this.redisService.setJson(key, userData, ttl);
  }

  /**
   * Get cached user profile
   */
  async getCachedUserProfile(userId: string): Promise<any | null> {
    const key = `${this.USER_CACHE_PREFIX}${userId}`;
    return this.redisService.getJson(key);
  }

  /**
   * Invalidate user profile cache
   */
  async invalidateUserProfile(userId: string): Promise<void> {
    const key = `${this.USER_CACHE_PREFIX}${userId}`;
    await this.redisService.delete(key);
  }

  /**
   * Cache user by email for quick lookups
   */
  async cacheUserByEmail(
    email: string,
    userId: string,
    ttl = this.DEFAULT_TTL,
  ): Promise<void> {
    const key = `${this.USER_EMAIL_PREFIX}${email}`;
    await this.redisService.set(key, userId, ttl);
  }

  /**
   * Get user ID from cached email
   */
  async getCachedUserIdByEmail(email: string): Promise<string | null> {
    const key = `${this.USER_EMAIL_PREFIX}${email}`;
    return this.redisService.get(key);
  }

  /**
   * Invalidate user email cache
   */
  async invalidateUserByEmail(email: string): Promise<void> {
    const key = `${this.USER_EMAIL_PREFIX}${email}`;
    await this.redisService.delete(key);
  }

  /**
   * Store OTP for email verification
   */
  async storeOTP(
    userId: string,
    otp: string,
    type: OtpType | string,
  ): Promise<void> {
    const key = `${this.USER_OTP_PREFIX}${userId}:${type}`;
    await this.redisService.set(key, otp, this.OTP_TTL);
  }

  /**
   * Get OTP from cache
   */
  async getOTP(
    userId: string,
    type: OtpType | string,
  ): Promise<string | null> {
    const key = `${this.USER_OTP_PREFIX}${userId}:${type}`;
    return this.redisService.get(key);
  }

  /**
   * Verify and delete OTP
   */
  async verifyAndDeleteOTP(
    userId: string,
    otp: string,
    type: OtpType | string,
  ): Promise<boolean> {
    const cachedOtp = await this.getOTP(userId, type);
    if (cachedOtp === otp) {
      const key = `${this.USER_OTP_PREFIX}${userId}:${type}`;
      await this.redisService.delete(key);
      return true;
    }
    return false;
  }

  /**
   * Store user session
   */
  async storeUserSession(
    userId: string,
    sessionData: any,
    ttl = this.SESSION_TTL,
  ): Promise<void> {
    const key = `${this.USER_SESSION_PREFIX}${userId}`;
    await this.redisService.setJson(key, sessionData, ttl);
  }

  /**
   * Get user session
   */
  async getUserSession(userId: string): Promise<any | null> {
    const key = `${this.USER_SESSION_PREFIX}${userId}`;
    return this.redisService.getJson(key);
  }

  /**
   * Invalidate user session
   */
  async invalidateUserSession(userId: string): Promise<void> {
    const key = `${this.USER_SESSION_PREFIX}${userId}`;
    await this.redisService.delete(key);
  }

  /**
   * Invalidate all user caches (profile, session, email)
   */
  async invalidateAllUserCaches(userId: string, email: string): Promise<void> {
    const keys = [
      `${this.USER_CACHE_PREFIX}${userId}`,
      `${this.USER_SESSION_PREFIX}${userId}`,
      `${this.USER_EMAIL_PREFIX}${email}`,
    ];
    await this.redisService.deleteMany(keys);
  }

  /**
   * Increment login attempts for rate limiting
   */
  async incrementLoginAttempts(email: string, ttl = 900): Promise<number> {
    const key = `login:attempts:${email}`;
    const client = this.redisService.getClient();
    const attempts = await client.incr(key);
    if (attempts === 1) {
      await this.redisService.expireAt(key, ttl);
    }
    return attempts;
  }

  /**
   * Reset login attempts
   */
  async resetLoginAttempts(email: string): Promise<void> {
    const key = `login:attempts:${email}`;
    await this.redisService.delete(key);
  }

  /**
   * Get login attempts count
   */
  async getLoginAttempts(email: string): Promise<number> {
    const key = `login:attempts:${email}`;
    const value = await this.redisService.get(key);
    return value ? parseInt(value, 10) : 0;
  }

  /**
   * Clear all user-related cache (use cautiously)
   */
  async clearAllUserCache(): Promise<void> {
    const client = this.redisService.getClient();
    const keys = await client.keys(`${this.USER_CACHE_PREFIX}*`);
    if (keys.length > 0) {
      await this.redisService.deleteMany(keys);
    }
  }

  /**
   * Reusable helper to invalidate user cache with error handling
   * Invalidates user profile, session, and email caches
   */
  async invalidateUserCache(
    userId: string,
    email?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const keys = [`${this.USER_CACHE_PREFIX}${userId}`];

      if (email) {
        keys.push(`${this.USER_EMAIL_PREFIX}${email}`);
      }

      keys.push(`${this.USER_SESSION_PREFIX}${userId}`);

      await this.redisService.deleteMany(keys);

      console.log(
        `🗑️  Cache invalidated for user ${userId}${email ? ` (email: ${email})` : ''}`,
      );

      return { success: true };
    } catch (error) {
      // Log error but don't throw - Redis failure shouldn't break main API response
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(
        `⚠️  Failed to invalidate cache for user ${userId}: ${errorMsg}`,
      );
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Log cache hit
   */
  logCacheHit(userId: string, dataType: string = 'profile'): void {
    console.log(`✅ ${dataType} fetched from cache: ${userId}`);
  }

  /**
   * Log cache miss
   */
  logCacheMiss(userId: string, dataType: string = 'profile'): void {
    console.log(`📭 Cache miss for ${dataType}: ${userId} - fetching from DB`);
  }
}
