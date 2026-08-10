// src/lib/rate-limit/rate-limit.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  resetAt?: Date;
  totalAttempts?: number;
}

@Injectable()
export class RateLimitService {
  constructor(private prisma: PrismaService) {}

  async checkRateLimit(
    identifier: string,
    action: 'login' | 'signup' | 'otp' | 'password-reset',
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowMs);

    // Count attempts in the current window
    const attempts = await this.prisma.client.rateLimitAttempt.count({
      where: {
        identifier,
        action,
        createdAt: { gte: windowStart },
      },
    });

    const remainingAttempts = Math.max(0, config.maxAttempts - attempts);
    const allowed = attempts < config.maxAttempts;

    if (!allowed) {
      const resetAt = new Date(
        now.getTime() + (config.blockDurationMs || config.windowMs),
      );
      return {
        allowed: false,
        remainingAttempts: 0,
        resetAt,
        totalAttempts: attempts,
      };
    }

    return { allowed: true, remainingAttempts, totalAttempts: attempts };
  }

  async recordAttempt(
    identifier: string,
    action: 'login' | 'signup' | 'otp' | 'password-reset',
    success: boolean,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.prisma.client.rateLimitAttempt.create({
      data: {
        identifier,
        action,
        success,
        metadata,
      },
    });
  }

  async resetAttempts(identifier: string, action: string): Promise<void> {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    await this.prisma.client.rateLimitAttempt.deleteMany({
      where: {
        identifier,
        action,
        createdAt: { gte: fifteenMinutesAgo },
      },
    });
  }

  async cleanupOldAttempts(olderThanHours: number = 24): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    const result = await this.prisma.client.rateLimitAttempt.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    return result.count;
  }

  async getAttemptHistory(
    identifier: string,
    action: string,
    limit: number = 10,
  ) {
    return this.prisma.client.rateLimitAttempt.findMany({
      where: { identifier, action },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
