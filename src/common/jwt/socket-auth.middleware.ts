import { ENVEnum } from '@/common/enum/env.enum';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { AuthSocketError } from './socket-auth-error.enum';

@Injectable()
export class SocketAuthMiddleware {
  private readonly logger = new Logger(SocketAuthMiddleware.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Socket.IO middleware for JWT authentication
   * This runs before the connection is established
   */
  use() {
    return async (socket: Socket, next: (err?: Error) => void) => {
      try {
        // Extract token from authorization header or auth object
        const authHeader =
          socket.handshake.headers.authorization ||
          socket.handshake.auth?.token;

        if (!authHeader) {
          this.logger.warn(
            `Connection rejected - Missing authorization header: ${socket.id}`,
          );
          return next(new Error(AuthSocketError.MISSING_AUTH_HEADER));
        }

        // Handle both "Bearer token" and plain token formats
        const token = authHeader.startsWith('Bearer ')
          ? authHeader.split(' ')[1]
          : authHeader;

        if (!token || token.trim() === '') {
          this.logger.warn(`Connection rejected - Empty token: ${socket.id}`);
          return next(new Error(AuthSocketError.INVALID_OR_EMPTY_TOKEN));
        }

        // Verify JWT token
        const jwtSecret = this.configService.get<string>(ENVEnum.JWT_SECRET);
        if (!jwtSecret) {
          this.logger.error('JWT_SECRET is not configured');
          return next(new Error(AuthSocketError.SERVER_CONFIG_ERROR));
        }

        let payload: any;
        try {
          payload = jwt.verify(token, jwtSecret);
        } catch (jwtError: any) {
          this.logger.warn(
            `JWT verification failed: ${jwtError.message} - Socket: ${socket.id}`,
          );
          if (jwtError.name === 'TokenExpiredError') {
            return next(new Error(AuthSocketError.TOKEN_EXPIRED));
          } else if (jwtError.name === 'JsonWebTokenError') {
            return next(new Error(AuthSocketError.INVALID_TOKEN_SIGNATURE));
          } else {
            return next(new Error(AuthSocketError.TOKEN_VERIFICATION_FAILED));
          }
        }

        const userId = payload.sub;
        if (!userId) {
          this.logger.warn(`Token payload missing user ID: ${socket.id}`);
          return next(new Error(AuthSocketError.MISSING_USER_ID));
        }

        // Verify user exists in database
        const user = await this.prisma.client.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, role: true, name: true, fullName: true },
        });

        if (!user) {
          this.logger.warn(
            `User not found in database: ${userId} - Socket: ${socket.id}`,
          );
          return next(new Error(AuthSocketError.USER_NOT_FOUND));
        }

        // Attach authenticated user data to socket
        socket.data.userId = userId;
        socket.data.user = user;
        socket.data.authenticated = true;

        this.logger.log(
          `Socket authenticated successfully - User: ${userId}, Socket: ${socket.id}`,
        );

        // Allow connection to proceed
        next();
      } catch (error: any) {
        this.logger.error(
          `Socket authentication error: ${error.message} - Socket: ${socket.id}`,
        );
        return next(new Error(error.message || AuthSocketError.AUTH_FAILED));
      }
    };
  }
}
