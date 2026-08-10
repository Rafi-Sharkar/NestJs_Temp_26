import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { SocketAuthMiddleware } from '@/common/jwt/socket-auth.middleware';

/**
 * Notification Gateway - WebSocket management
 *
 * Responsibilities:
 * - JWT authentication on connection
 * - Track online users: userId → Set<Socket>
 * - Emit notifications to online users
 * - Handle disconnect & cleanup
 */
@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: true, credentials: true },
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('NotificationGateway');
  private clients = new Map<string, Set<Socket>>();

  constructor(private readonly socketAuthMiddleware: SocketAuthMiddleware) {}

  async afterInit(server: Server) {
    server.use(this.socketAuthMiddleware.use());
    this.logger.log('Notification Gateway initialized with JWT middleware');
  }

  async handleConnection(client: Socket) {
    try {
      const userId = client.data.userId;
      const user = client.data.user;

      if (!userId || !user) {
        this.logger.warn('Unauthenticated socket reached handleConnection');
        client.disconnect(true);
        return;
      }

      if (!this.clients.has(userId)) {
        this.clients.set(userId, new Set());
      }
      this.clients.get(userId)!.add(client);
      client.data.userId = userId;

      this.logger.log(
        `✓ ${userId} connected (total sockets: ${this.clients.get(userId)!.size})`,
      );
      client.emit('connected', {
        userId,
        message: 'Connected to notifications',
      });
    } catch (error: any) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId && this.clients.has(userId)) {
      const sockets = this.clients.get(userId)!;
      sockets.delete(client);

      if (sockets.size === 0) {
        this.clients.delete(userId);
        this.logger.log(`✗ ${userId} disconnected (all sockets closed)`);
      }
    }
  }

  isUserOnline(userId: string): boolean {
    const sockets = this.clients.get(userId);
    return sockets ? sockets.size > 0 : false;
  }

  getClientsForUser(userId: string): Set<Socket> {
    return this.clients.get(userId) || new Set();
  }

  emitToUser(userId: string, event: string, data: any) {
    const sockets = this.clients.get(userId);
    if (sockets) {
      sockets.forEach((socket) => socket.emit(event, data));
      this.logger.log(`📤 ${event} → ${userId} (${sockets.size} sockets)`);
    }
  }

  broadcastToAll(event: string, data: any) {
    this.server.emit(event, data);
    this.logger.log(
      `📢 Broadcast ${event} (${this.clients.size} users online)`,
    );
  }

  getOnlineCount(): number {
    return this.clients.size;
  }

  getOnlineUserIds(): string[] {
    return Array.from(this.clients.keys());
  }
}
