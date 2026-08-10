import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { ENVEnum } from '@/common/enum/env.enum';

@Injectable()
export class RedisService {
  private client: Redis;

  constructor(private configService: ConfigService) {
    this.initializeRedis();
  }

  private initializeRedis() {
    const host = this.configService.getOrThrow<string>(ENVEnum.REDIS_HOST);
    const port = parseInt(
      this.configService.getOrThrow<string>(ENVEnum.REDIS_PORT),
      10,
    );

    this.client = new Redis({
      host,
      port,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: null,
    });

    this.client.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    this.client.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });
  }

  /**
   * Get a value from Redis
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Get and parse JSON value from Redis
   */
  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  /**
   * Set a value in Redis with optional expiration (in seconds)
   */
  async set(
    key: string,
    value: string,
    expirationInSeconds?: number,
  ): Promise<void> {
    if (expirationInSeconds) {
      await this.client.setex(key, expirationInSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Set a JSON value in Redis with optional expiration
   */
  async setJson(
    key: string,
    value: any,
    expirationInSeconds?: number,
  ): Promise<void> {
    const jsonString = JSON.stringify(value);
    await this.set(key, jsonString, expirationInSeconds);
  }

  /**
   * Delete a key from Redis
   */
  async delete(key: string): Promise<number> {
    return this.client.del(key);
  }

  /**
   * Delete multiple keys from Redis
   */
  async deleteMany(keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return this.client.del(...keys);
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Get TTL for a key (in seconds)
   */
  async getTTL(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  /**
   * Extend TTL for a key
   */
  async expireAt(key: string, expirationInSeconds: number): Promise<number> {
    return this.client.expire(key, expirationInSeconds);
  }

  /**
   * Flush all Redis data (use cautiously!)
   */
  async flush(): Promise<void> {
    await this.client.flushdb();
  }

  /**
   * Get the underlying Redis client for advanced operations
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.client.quit();
  }
}
