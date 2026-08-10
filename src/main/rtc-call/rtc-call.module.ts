import { Module } from '@nestjs/common';
import { RtcCallService } from './rtc-call.service';
import { RtcCallController } from './rtc-call.controller';
import { RtcCallGateway } from './rtc-call.gateway';
import { SocketAuthMiddleware } from '@/common/jwt/socket-auth.middleware';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [RtcCallController],
  providers: [RtcCallService, RtcCallGateway, SocketAuthMiddleware],
  exports: [RtcCallService],
})
export class RtcCallModule {}
