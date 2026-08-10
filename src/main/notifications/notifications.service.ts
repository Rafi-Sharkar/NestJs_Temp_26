import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { NotificationEventType } from './events';

const NOTIFICATION_QUEUE_NAME = 'notification-queue';

export interface NotificationJobData {
  type: NotificationEventType;
  recipientId: string;
  title: string;
  message: string;
  meta?: Record<string, any>;
  senderId?: string;
  actionType?: string;
}

export interface PersistNotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
  meta?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('NotificationsService');

  constructor(
    @InjectQueue(NOTIFICATION_QUEUE_NAME)
    private readonly notificationQueue: Queue<NotificationJobData>,
    private readonly prisma: PrismaService,
  ) {}

  async addNotification(data: NotificationJobData) {
    const job = await this.notificationQueue.add(
      NOTIFICATION_QUEUE_NAME,
      data,
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      },
    );

    this.logger.log(`Job queued: ${job.id} (${data.type})`);
    return job;
  }

  async addNotificationsBatch(dataList: NotificationJobData[]) {
    return this.notificationQueue.addBulk(
      dataList.map((data) => ({
        name: NOTIFICATION_QUEUE_NAME,
        data,
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
        },
      })),
    );
  }

  async persistNotificationData(data: PersistNotificationData) {
    const notification = await this.prisma.client.notification.create({
      data: {
        type: data.type,
        title: data.title,
        message: data.message,
        meta: data.meta || {},
      },
    });

    await this.prisma.client.userNotification.create({
      data: {
        userId: data.userId,
        notificationId: notification.id,
        read: false,
      },
    });

    this.logger.log(
      `Persisted notification ${notification.id} for ${data.userId}`,
    );

    return notification;
  }

  async persistNotificationDataForUsers(
    userIds: string[],
    data: Omit<PersistNotificationData, 'userId'>,
  ) {
    const notification = await this.prisma.client.notification.create({
      data: {
        type: data.type,
        title: data.title,
        message: data.message,
        meta: data.meta || {},
      },
    });

    await this.prisma.client.userNotification.createMany({
      data: userIds.map((userId) => ({
        userId,
        notificationId: notification.id,
        read: false,
      })),
      skipDuplicates: true,
    });

    this.logger.log(
      `Persisted notification ${notification.id} for ${userIds.length} users`,
    );

    return notification;
  }

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.prisma.client.userNotification.findMany({
        where: { userId },
        include: { notification: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.client.userNotification.count({ where: { userId } }),
    ]);

    return {
      data: notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUnreadCount(userId: string) {
    return this.prisma.client.userNotification.count({
      where: { userId, read: false },
    });
  }

  async markAsRead(userNotificationId: string) {
    return this.prisma.client.userNotification.update({
      where: { id: userNotificationId },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.client.userNotification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async deleteNotification(userNotificationId: string) {
    return this.prisma.client.userNotification.delete({
      where: { id: userNotificationId },
    });
  }

  async getPreferences(userId: string) {
    return this.prisma.client.notificationToggle.findUnique({
      where: { userId },
    });
  }

  async isNotificationEnabled(userId: string, type: string): Promise<boolean> {
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
      'collaboration.invite': 'message',
    };

    const field = typeMap[type];
    return field ? (toggle[field] as boolean) : true;
  }
}
