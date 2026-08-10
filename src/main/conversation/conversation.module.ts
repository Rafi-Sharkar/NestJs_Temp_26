import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { ConversationGateway } from './conversation.gateway';
import { SocketAuthMiddleware } from '@/common/jwt/socket-auth.middleware';

import { NotificationsModule } from '../notifications/notifications.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [NotificationsModule, AiModule],
  controllers: [ConversationController],
  providers: [ConversationService, ConversationGateway, SocketAuthMiddleware],
})
export class ConversationModule {}
