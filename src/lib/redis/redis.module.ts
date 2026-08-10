import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service';
import { UserCacheService } from './user-cache.service';

@Module({
  imports: [ConfigModule],
  providers: [RedisService, UserCacheService],
  exports: [RedisService, UserCacheService],
})
export class RedisModule {}
