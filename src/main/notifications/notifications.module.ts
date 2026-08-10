import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '@/lib/prisma/prisma.module';
import { SocketAuthMiddleware } from '@/common/jwt/socket-auth.middleware';
import { NotificationGateway } from './gateway/notifications.gateway';
import { PaymentNotificationProcessor } from './processors/payment.processor';
import { PaymentNotificationListener } from './listeners/payment.listener';
import { SocialNotificationListener } from './listeners/social.listener';
import { ProposalNotificationListener } from './listeners/proposal.listener';
import { SeedNotificationListener } from './listeners/seed.listener';
import { ReportListener } from './listeners/report.listener';
import { NotificationsService } from './notifications.service';
import { FirebaseModule } from '@/lib/firebase/firebase.module';
import { FcmService } from './fcm.service';

const NOTIFICATION_QUEUE_NAME = 'notification-queue';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueueAsync({
      name: NOTIFICATION_QUEUE_NAME,
      useFactory: (configService: ConfigService) => ({
        connection: configService.get('REDIS_URL')
          ? { url: configService.get('REDIS_URL') }
          : {
              host: configService.get('REDIS_HOST') || 'localhost',
              port: configService.get('REDIS_PORT') || 6379,
            },
      }),
      inject: [ConfigService],
    }),
    FirebaseModule,
  ],
  providers: [
    NotificationGateway,
    SocketAuthMiddleware,
    PaymentNotificationProcessor,
    PaymentNotificationListener,
    SocialNotificationListener,
    ProposalNotificationListener,
    SeedNotificationListener,
    ReportListener,
    NotificationsService,
    FcmService,
  ],
  exports: [
    NotificationGateway,
    PaymentNotificationListener,
    SocialNotificationListener,
    ProposalNotificationListener,
    SeedNotificationListener,
    ReportListener,
    NotificationsService,
    FcmService,
  ],
})
export class NotificationsModule {}
