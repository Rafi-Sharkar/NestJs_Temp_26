// src/lib/rate-limit/rate-limit-cleanup.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RateLimitService } from './rate-limit.service';

@Injectable()
export class RateLimitCleanupService {
  private readonly logger = new Logger(RateLimitCleanupService.name);

  constructor(private rateLimitService: RateLimitService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldAttempts() {
    this.logger.log('Starting rate limit cleanup...');

    try {
      const deletedCount = await this.rateLimitService.cleanupOldAttempts(24);
      this.logger.log(`Cleaned up ${deletedCount} old rate limit attempts`);
    } catch (error) {
      this.logger.error('Failed to cleanup rate limit attempts', error);
    }
  }
}
