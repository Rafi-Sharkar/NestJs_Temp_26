import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { WEBSOCKET_CORS_CONFIG } from '@/common/constants/cors.constant';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { ConversationService } from './conversation.service';
import { SocketAuthMiddleware } from '../../common/jwt/socket-auth.middleware';
import { FcmService } from '../notifications/fcm.service';
import { AiChatService } from '../ai/ai-chat.service';
import { Server, Socket } from 'socket.io';
import { ConversationEvents } from './dto/events.enum';
import {
  SendMessageDto,
  MarkMessageAsReadDto,
  LoadConversationMessagesDto,
} from './dto/send-message.dto';

@WebSocketGateway({
  cors: WEBSOCKET_CORS_CONFIG,
  namespace: '/conversation',
})
export class ConversationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ConversationGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationService: ConversationService,
    private readonly socketAuthMiddleware: SocketAuthMiddleware,
    private readonly fcmService: FcmService,
    private readonly aiChatService: AiChatService,
  ) {}

  afterInit(server: Server) {
    server.use(this.socketAuthMiddleware.use());
    this.logger.log('Conversation gateway initialized.');
  }

  private async getConversationMembers(
    conversationId: string,
  ): Promise<string[]> {
    const conversation = await this.prisma.client.conversation.findUnique({
      where: { id: conversationId },
      include: { members: true },
    });
    if (!conversation) return [];
    if (conversation.type === 'INDIVIDUAL') {
      return [conversation.user1Id, conversation.user2Id].filter(
        Boolean,
      ) as string[];
    }
    return conversation.members.map((m: any) => m.userId);
  }

  async handleConnection(client: Socket) {
    const userId = client.data.userId;
    const user = client.data.user;

    if (!userId || !user) {
      this.logger.warn(`Connection rejected - Invalid user data: ${client.id}`);
      client.disconnect();
      return;
    }

    try {
      // Join user-specific room
      await client.join(`user:${userId}`);

      // Fetch full user data
      const fullUser = await this.prisma.client.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          fullName: true,
          role: true,
          userType: true,
          isOnline: true,
          isVerified: true,
          biography: true,
          gender: true,
          isCreator: true,
          isBrand: true,
        },
      });

      const now = new Date();

      // Update user online status
      await this.prisma.client.user.update({
        where: { id: userId },
        data: { isOnline: true, lastActiveAt: now },
      });

      // Emit user info back to client
      client.emit(ConversationEvents.CONVERSATION_USER_INFO, {
        success: true,
        message: 'Successfully connected',
        user: fullUser,
      });

      // Load and emit conversations list on connect
      const { active, requests } = await this.conversationService.loadConversationsForUser(userId);
      client.emit(ConversationEvents.CONVERSATION_LIST, {
        success: true,
        message: 'Conversations loaded successfully',
        conversations: active,
        requests,
      });

      // Broadcast status change
      this.server.emit(ConversationEvents.USER_STATUS_CHANGED, {
        userId,
        isOnline: true,
        lastActiveAt: now,
      });

      // Log user connection with info
      this.logger.log(
        `User connected - ID: ${userId}, Email: ${user.email}, Role: ${user.role}, Socket: ${client.id}`,
      );
    } catch (error: any) {
      this.logger.error(`Error in handleConnection: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (!userId) {
      return;
    }

    try {
      const now = new Date();

      // Update user offline status
      await this.prisma.client.user.update({
        where: { id: userId },
        data: { isOnline: false, lastActiveAt: now },
      });

      // Broadcast status change
      this.server.emit(ConversationEvents.USER_STATUS_CHANGED, {
        userId,
        isOnline: false,
        lastActiveAt: now,
      });

      // Log user disconnection
      this.logger.log(
        `User disconnected - ID: ${userId}, Socket: ${client.id}`,
      );
    } catch (error: any) {
      this.logger.error(`Error in handleDisconnect: ${error.message}`);
    }
  }

  @SubscribeMessage(ConversationEvents.LOAD_CONVERSATIONS)
  async handleLoadConversations(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    const userId = client.data.userId;

    if (!userId) {
      client.emit(ConversationEvents.CONVERSATION_LIST, {
        success: false,
        message: 'Unauthorized',
        conversations: [],
      });
      return;
    }

    try {
      this.logger.log(`Loading conversations for user: ${userId}`);

      // Call service to get conversations
      const statusFilter = payload?.status ? (Array.isArray(payload.status) ? payload.status : [payload.status]) : undefined;
      const { active, requests } = await this.conversationService.loadConversationsForUser(userId, statusFilter);

      // Emit conversations list back to client
      client.emit(ConversationEvents.CONVERSATION_LIST, {
        success: true,
        message: 'Conversations loaded successfully',
        conversations: active,
        requests: requests,
      });

      this.logger.log(
        `Conversations loaded for user ${userId} - Count: ${active.length}, Requests: ${requests.length}`,
      );
    } catch (error: any) {
      this.logger.error(`Error loading conversations: ${error.message}`);
      client.emit(ConversationEvents.CONVERSATION_LIST, {
        success: false,
        message: error.message || 'Failed to load conversations',
        conversations: [],
      });
    }
  }

  @SubscribeMessage(ConversationEvents.SEND_MESSAGE)
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessageDto,
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
      const result = await this.conversationService.sendMessage(
        userId,
        payload,
      );

      // Emit MESSAGE_SENT to sender
      client.emit(ConversationEvents.MESSAGE_SENT, result);

      // Emit RECEIVE_MESSAGE to other participants
      const members = await this.getConversationMembers(payload.conversationId);
      const otherMembers = members.filter((id) => id !== userId);
      const aiUserId = this.aiChatService.getAiUserId();
      const hasAiMember = otherMembers.includes(aiUserId);

      for (const memberId of otherMembers) {
        if (memberId === aiUserId) continue; // Skip AI user for standard notifications

        this.server
          .to(`user:${memberId}`)
          .emit(ConversationEvents.RECEIVE_MESSAGE, result);

        // Send push notification for chat message
        const senderName =
          client.data.user?.fullName || client.data.user?.name || 'Someone';
        const messageText =
          payload.content ||
          (payload.mediaType === 'IMAGE' ? 'Sent an image' : 'Sent a message');
        this.fcmService
          .sendToUser(memberId, {
            title: senderName,
            body: messageText,
            data: {
              type: 'chat_message',
              conversationId: payload.conversationId,
              senderId: userId,
            },
          })
          .catch((err) =>
            this.logger.error(`Failed to send chat FCM to ${memberId}:`, err),
          );
      }

      if (hasAiMember) {
        this.triggerAiResponse(client, payload.conversationId);
      }
    } catch (error: any) {
      client.emit(ConversationEvents.MESSAGE_SENT, {
        success: false,
        message: error.message || 'Failed to send message',
      });
    }
  }

  private async triggerAiResponse(client: Socket, conversationId: string) {
    const aiUserId = this.aiChatService.getAiUserId();

    try {
      // Notify user that AI is typing
      client.emit(ConversationEvents.TYPING_START, {
        conversationId,
        userId: aiUserId,
      });

      let fullReply = '';
      
      // Stream chunks to frontend
      for await (const chunk of this.aiChatService.streamReply(conversationId)) {
        fullReply += chunk;
        client.emit('ai:chunk', { conversationId, chunk });
      }

      // Save the AI's message to the database
      const aiMessageResult = await this.conversationService.sendMessage(aiUserId, {
        conversationId,
        content: fullReply,
      });

      // Emit the final full message
      client.emit(ConversationEvents.RECEIVE_MESSAGE, aiMessageResult);
      client.emit('ai:done', { conversationId });

    } catch (error: any) {
      this.logger.error(`Error in AI response: ${error.message}`);
      client.emit('ai:error', { message: 'Failed to generate AI response' });
    } finally {
      client.emit(ConversationEvents.TYPING_STOP, {
        conversationId,
        userId: aiUserId,
      });
    }
  }

  @SubscribeMessage(ConversationEvents.LOAD_SINGLE_CONVERSATION)
  async handleLoadSingleConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
      const result = await this.conversationService.loadSingleConversation(
        userId,
        payload.conversationId,
      );
      client.emit(ConversationEvents.LOAD_SINGLE_CONVERSATION, result);
    } catch (error: any) {
      client.emit(ConversationEvents.LOAD_SINGLE_CONVERSATION, {
        success: false,
        message: error.message || 'Failed to load conversation',
      });
    }
  }

  @SubscribeMessage(ConversationEvents.CONVERSATION_MESSAGES)
  async handleLoadConversationMessages(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: LoadConversationMessagesDto,
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
      const result = await this.conversationService.loadConversationMessages(
        userId,
        payload.conversationId,
        payload.page,
        payload.limit,
      );
      client.emit(ConversationEvents.CONVERSATION_MESSAGES, result);
    } catch (error: any) {
      client.emit(ConversationEvents.CONVERSATION_MESSAGES, {
        success: false,
        message: error.message || 'Failed to load messages',
      });
    }
  }

  @SubscribeMessage(ConversationEvents.MESSAGE_READ)
  async handleMessageRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: MarkMessageAsReadDto,
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
      const result = await this.conversationService.markMessageAsRead(
        userId,
        payload.messageId,
      );

      const message = await this.prisma.client.message.findUnique({
        where: { id: payload.messageId },
      });

      if (message && message.senderId !== userId) {
        this.server
          .to(`user:${message.senderId}`)
          .emit(ConversationEvents.MESSAGE_READ, {
            messageId: payload.messageId,
            conversationId: message.conversationId,
            readBy: userId,
          });
      }
    } catch (error: any) {
      this.logger.error(`Error marking message as read: ${error.message}`);
    }
  }

  @SubscribeMessage(ConversationEvents.TYPING_START)
  async handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const members = await this.getConversationMembers(payload.conversationId);
    const otherMembers = members.filter((id) => id !== userId);

    for (const memberId of otherMembers) {
      this.server.to(`user:${memberId}`).emit(ConversationEvents.TYPING_START, {
        conversationId: payload.conversationId,
        userId: userId,
      });
    }
  }

  @SubscribeMessage(ConversationEvents.TYPING_STOP)
  async handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const members = await this.getConversationMembers(payload.conversationId);
    const otherMembers = members.filter((id) => id !== userId);

    for (const memberId of otherMembers) {
      this.server.to(`user:${memberId}`).emit(ConversationEvents.TYPING_STOP, {
        conversationId: payload.conversationId,
        userId: userId,
      });
    }
  }

  @SubscribeMessage(ConversationEvents.GET_USER_STATUS)
  async handleGetUserStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: string },
  ) {
    if (!payload || !payload.userId) return;

    try {
      const user = await this.prisma.client.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, isOnline: true, lastActiveAt: true },
      });

      if (user) {
        client.emit(ConversationEvents.USER_STATUS, user);
      }
    } catch (error: any) {
      this.logger.error(`Error getting user status: ${error.message}`);
    }
  }

  @SubscribeMessage(ConversationEvents.SET_USER_STATUS)
  async handleSetUserStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { isOnline: boolean },
  ) {
    const userId = client.data.userId;
    if (!userId || typeof payload.isOnline !== 'boolean') return;

    try {
      const now = new Date();
      await this.prisma.client.user.update({
        where: { id: userId },
        data: { isOnline: payload.isOnline, lastActiveAt: now },
      });

      this.server.emit(ConversationEvents.USER_STATUS_CHANGED, {
        userId,
        isOnline: payload.isOnline,
        lastActiveAt: now,
      });
    } catch (error: any) {
      this.logger.error(`Error setting user status: ${error.message}`);
    }
  }

  @SubscribeMessage(ConversationEvents.MESSAGE_REACT)
  async handleMessageReact(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { messageId: string; emoji: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !payload.messageId || !payload.emoji) return;

    try {
      const result = await this.conversationService.reactToMessage(
        userId,
        payload.messageId,
        payload.emoji,
      );

      const conversationId = result.data?.conversationId;
      if (!conversationId) return;

      const members = await this.getConversationMembers(conversationId);
      
      for (const memberId of members) {
        this.server.to(`user:${memberId}`).emit(ConversationEvents.MESSAGE_REACTED, {
          messageId: payload.messageId,
          conversationId,
          emoji: payload.emoji,
          action: result.action,
          userId,
        });
      }
    } catch (error: any) {
      this.logger.error(`Error reacting to message: ${error.message}`);
    }
  }

  @SubscribeMessage(ConversationEvents.MESSAGE_UNSEND)
  async handleMessageUnsend(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { messageId: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !payload.messageId) return;

    try {
      const result = await this.conversationService.unsendMessage(
        userId,
        payload.messageId,
      );

      const conversationId = result.data?.conversationId;
      if (!conversationId) return;

      const members = await this.getConversationMembers(conversationId);
      
      for (const memberId of members) {
        this.server.to(`user:${memberId}`).emit(ConversationEvents.MESSAGE_UNSENT, {
          messageId: payload.messageId,
          conversationId,
        });
      }
    } catch (error: any) {
      this.logger.error(`Error unsending message: ${error.message}`);
    }
  }

  @SubscribeMessage('conversation:message_delete_for_me')
  async handleMessageDeleteForMe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { messageId: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !payload.messageId) return;

    try {
      const result = await this.conversationService.deleteMessageForMe(
        userId,
        payload.messageId,
      );

      const conversationId = result.data?.conversationId;
      if (!conversationId) return;

      this.server.to(`user:${userId}`).emit(ConversationEvents.MESSAGE_DELETED_FOR_ME, {
        messageId: payload.messageId,
        conversationId,
        userId,
      });
    } catch (error: any) {
      this.logger.error(`Error deleting message for me: ${error.message}`);
    }
  }
}
