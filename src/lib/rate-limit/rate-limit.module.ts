import { Global, Module } from '@nestjs/common';
import { RateLimitCleanupService } from './rate-limit-cleanup.service';
import { RateLimitService } from './rate-limit.service';

@Global()
@Module({
  providers: [RateLimitService, RateLimitCleanupService],
  exports: [RateLimitService, RateLimitCleanupService],
})
export class RateLimitModule {}
