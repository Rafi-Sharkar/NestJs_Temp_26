import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

import { MailModule } from './mail/mail.module';
import { PrismaModule } from './prisma/prisma.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { SeedModule } from './seed/seed.module';
import { UtilsModule } from './utils/utils.module';
import { RedisModule } from './redis/redis.module';

@Global()
@Module({
  imports: [PrismaModule, MailModule, SeedModule, UtilsModule, RateLimitModule, RedisModule],
  providers: [
    {
      provide: 'STRIPE_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const key = config.get<string>('STRIPE_SECRET_KEY');
        return key
          ? new Stripe(key, { apiVersion: '2026-02-25.clover' as any })
          : null;
      },
    },
  ],
  exports: ['STRIPE_CLIENT', RedisModule],
})
export class LibModule {}