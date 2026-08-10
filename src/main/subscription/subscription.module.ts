import { Module } from '@nestjs/common';
import { PrismaModule } from '@/lib/prisma/prisma.module';
import { SubscriptionWebhookController } from './subscription-webhook.controller';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';

@Module({
  imports: [PrismaModule],
  controllers: [SubscriptionController, SubscriptionWebhookController],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
