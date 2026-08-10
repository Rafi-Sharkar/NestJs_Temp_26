import { Injectable, Inject, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '@/lib/prisma/prisma.service';

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);

  constructor(
    @Inject('FIREBASE_ADMIN') private firebaseAdmin: admin.app.App | null,
    private prisma: PrismaService,
  ) {}

  private ensureFirebase(): admin.app.App | null {
    if (!this.firebaseAdmin) {
      this.logger.warn(
        'FCM skipped: Firebase is not configured (FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY).',
      );
    }
    return this.firebaseAdmin;
  }

  // The Session table is intentionally absent from the current schema, so there
  // is no per-user FCM token registry. FCM is therefore a no-op until that
  // table is reintroduced. These methods are kept as a stable interface so the
  // rest of the codebase does not have to change.
  async sendToUser(
    userId: string,
    payload: {
      title: string;
      body: string;
      data?: Record<string, string>;
    },
  ) {
    this.logger.warn(
      `FCM skipped: sessions table is not present in the current schema (userId=${userId}).`,
    );
    return null;
  }

  async sendToToken(
    token: string,
    payload: {
      title: string;
      body: string;
      data?: Record<string, string>;
    },
  ) {
    if (!this.ensureFirebase()) return null;
    try {
      const message: admin.messaging.Message = {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data ?? {},
        android: {
          priority: 'high',
          notification: { channelId: 'default' },
        },
        apns: {
          payload: {
            aps: { sound: 'default', badge: 1 },
          },
        },
      };
      return await admin.messaging().send(message);
    } catch (error: any) {
      this.logger.error(`FCM send failed: ${error.message}`);
      throw error;
    }
  }

  async sendToMultiple(
    tokens: string[],
    payload: {
      title: string;
      body: string;
      data?: Record<string, string>;
    },
  ) {
    if (!this.ensureFirebase()) return null;
    if (!tokens.length) return null;

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: { title: payload.title, body: payload.body },
      data: payload.data ?? {},
    };

    return admin.messaging().sendEachForMulticast(message);
  }

  // --- DATA ONLY NOTIFICATIONS ---

  async sendDataOnlyToUser(
    userId: string,
    dataPayload: Record<string, string>,
  ) {
    this.logger.warn(
      `FCM data-only skipped: sessions table is not present in the current schema (userId=${userId}).`,
    );
    return null;
  }

  async sendDataOnlyToToken(token: string, dataPayload: Record<string, string>) {
    if (!this.ensureFirebase()) return null;
    try {
      const message: admin.messaging.Message = {
        token,
        data: dataPayload,
        android: { priority: 'high' },
        apns: {
          headers: { 'apns-priority': '10' },
          payload: { aps: { 'content-available': 1 } },
        },
      };
      return await admin.messaging().send(message);
    } catch (error: any) {
      this.logger.error(`FCM data-only send failed: ${error.message}`);
      throw error;
    }
  }

  async sendDataOnlyToMultiple(tokens: string[], dataPayload: Record<string, string>) {
    if (!this.ensureFirebase()) return null;
    if (!tokens.length) return null;
    const message: admin.messaging.MulticastMessage = {
      tokens,
      data: dataPayload,
    };
    return admin.messaging().sendEachForMulticast(message);
  }
}