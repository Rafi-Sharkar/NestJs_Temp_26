import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from '../notifications.service';
import { SeedNotificationEvent } from '../events/seed.events';

@Injectable()
export class SeedNotificationListener {
  private readonly logger = new Logger(SeedNotificationListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  async notifySeedSpent(userId: string, amount: number) {
    const notificationData = {
      type: SeedNotificationEvent.SEED_SPENT,
      recipientId: userId,
      title: 'Seeds Spent',
      message: `You have spent ${amount} seeds.`,
      meta: { amount },
    };

    try {
      await this.notificationsService.addNotification(notificationData);
    } catch (error: any) {
      this.logger.error(
        `Error sending seed spent notification: ${error.message}`,
      );
    }
  }

  async notifySeedEmpty(userId: string) {
    const notificationData = {
      type: SeedNotificationEvent.SEED_EMPTY,
      recipientId: userId,
      title: 'Out of Seeds',
      message: 'You have no usable seeds left.',
      meta: {},
    };

    try {
      await this.notificationsService.addNotification(notificationData);
    } catch (error: any) {
      this.logger.error(
        `Error sending seed empty notification: ${error.message}`,
      );
    }
  }

  async notifySeedEarned(userId: string, amount: number, senderId?: string) {
    const notificationData = {
      type: SeedNotificationEvent.SEED_EARNED,
      recipientId: userId,
      title: 'Seeds Earned',
      message: `You have earned ${amount} seeds.`,
      meta: { amount, senderId },
    };

    if (senderId) {
      (notificationData as any).senderId = senderId;
    }

    try {
      await this.notificationsService.addNotification(notificationData);
    } catch (error: any) {
      this.logger.error(
        `Error sending seed earned notification: ${error.message}`,
      );
    }
  }
}
