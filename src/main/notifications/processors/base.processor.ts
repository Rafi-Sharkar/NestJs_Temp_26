import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { WorkerHost } from '@nestjs/bullmq';
import { NotificationGateway } from '../gateway/notifications.gateway';
import { NotificationJobData } from '../notifications.service';
import { FcmService } from '../fcm.service';

export abstract class BaseNotificationProcessor extends WorkerHost {
  protected readonly prisma: PrismaService;
  protected readonly gateway: NotificationGateway;
  protected readonly fcmService: FcmService;
  protected readonly logger: Logger;

  constructor(
    prisma: PrismaService,
    gateway: NotificationGateway,
    fcmService: FcmService,
    processorName: string = 'BaseNotificationProcessor',
  ) {
    super();
    this.prisma = prisma;
    this.gateway = gateway;
    this.fcmService = fcmService;
    this.logger = new Logger(processorName);
  }

  async process(job: Job<NotificationJobData>): Promise<any> {
    const { recipientId, title, message, meta, type, senderId, actionType } =
      job.data;

    try {
      this.logger.log(`Processing: ${type} → ${recipientId}`);

      const isEnabled = await this.isNotificationEnabled(recipientId, type);
      if (!isEnabled) {
        this.logger.log(`⊘ ${recipientId} disabled ${type}`);
        return { delivered: 'skipped', reason: 'notification_disabled' };
      }

      const isOnline = this.gateway.isUserOnline(recipientId);

      const notificationPayload = {
        type,
        title,
        message,
        createdAt: new Date(),
        meta: { ...meta, senderId, actionType },
      };

      if (isOnline) {
        this.logger.log(`✓ ${recipientId} ONLINE → socket emit + DB save`);
        this.gateway.emitToUser(recipientId, type, notificationPayload);

        const notifId = await this.persistNotification(recipientId, {
          type,
          title,
          message,
          meta,
        });

        // Try sending a push notification anyway, as they might have the app in background
        try {
          await this.fcmService.sendToUser(recipientId, {
            title,
            body: message,
            data: meta as Record<string, string>,
          });
        } catch (pushError: any) {
          this.logger.error(`Push notification failed: ${pushError.message}`);
        }

        return {
          delivered: 'socket',
          notificationId: notifId,
          socketCount: this.gateway.getClientsForUser(recipientId).size,
        };
      }

      this.logger.log(`✗ ${recipientId} OFFLINE → DB save only`);

      const notifId = await this.persistNotification(recipientId, {
        type,
        title,
        message,
        meta,
      });

      // Try sending a push notification since they are offline (or online, usually push happens regardless)
      try {
        await this.fcmService.sendToUser(recipientId, {
          title,
          body: message,
          data: meta as Record<string, string>,
        });
      } catch (pushError: any) {
        this.logger.error(`Push notification failed: ${pushError.message}`);
      }

      return {
        delivered: 'database',
        notificationId: notifId,
        reason: 'user_offline',
      };
    } catch (error: any) {
      this.logger.error(`Error: ${error.message}`, error.stack);
      throw error;
    }
  }

  protected async persistNotification(
    userId: string,
    notificationData: {
      type: string;
      title: string;
      message: string;
      meta?: Record<string, any>;
    },
  ): Promise<string> {
    const notification = await this.prisma.client.notification.create({
      data: {
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        meta: notificationData.meta || {},
      },
    });

    await this.prisma.client.userNotification.create({
      data: {
        userId,
        notificationId: notification.id,
        read: false,
      },
    });

    return notification.id;
  }

  protected async isNotificationEnabled(
    userId: string,
    type: string,
  ): Promise<boolean> {
    try {
      const toggle = await this.prisma.client.notificationToggle.findUnique({
        where: { userId },
      });

      if (!toggle) return true;

      const typeMap: Record<string, keyof typeof toggle> = {
        PAYMENT_RECEIVED: 'payment',
        NEW_MESSAGE: 'message',
        POST_LIKED: 'message',
        FOLLOW_STARTED: 'message',
        'social.tagged': 'message',
        'social.commented': 'message',
        'proposal.reminder': 'planStarted',
        'proposal.cancelled': 'planStarted',
        'seed.spent': 'payment',
        'seed.empty': 'payment',
        'seed.earned': 'payment',
      };

      const field = typeMap[type];
      return field ? (toggle[field] as boolean) : true;
    } catch (error: any) {
      this.logger.warn(`Error checking notification enabled: ${error.message}`);
      return true;
    }
  }
}
