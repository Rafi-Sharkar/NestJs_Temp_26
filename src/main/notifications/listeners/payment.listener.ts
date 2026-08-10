import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from '../notifications.service';
import { PaymentNotificationEvent } from '../events/payment.events';

@Injectable()
export class PaymentNotificationListener {
  private readonly logger = new Logger(PaymentNotificationListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  async notifySubscriptionRenewed(
    userId: string,
    planName: string,
    amount: number,
    nextRenewalDate: Date,
  ) {
    const notificationData = {
      type: PaymentNotificationEvent.SUBSCRIPTION_RENEWED,
      recipientId: userId,
      title: `${planName} renewed`,
      message: `Next renewal: ${nextRenewalDate.toDateString()}`,
      meta: { planName, amount, nextRenewalDate },
    };

    try {
      // Persist to database
      await this.notificationsService.persistNotificationData({
        userId,
        type: PaymentNotificationEvent.SUBSCRIPTION_RENEWED,
        title: `${planName} renewed`,
        message: `Next renewal: ${nextRenewalDate.toDateString()}`,
        meta: { planName, amount, nextRenewalDate },
      });

      // Enqueue to job queue for real-time delivery
      await this.notificationsService.addNotification(notificationData);

      this.logger.log(
        `✓ Subscription renewal notification sent: ${userId} (${planName})`,
      );
    } catch (error: any) {
      this.logger.error(
        `✗ Error sending subscription renewal notification: ${error.message}`,
      );
      throw error;
    }
  }

  async notifySubscriptionExpiring(
    userId: string,
    planName: string,
    daysLeft: number,
  ) {
    const notificationData = {
      type: PaymentNotificationEvent.SUBSCRIPTION_EXPIRING,
      recipientId: userId,
      title: `${planName} expires in ${daysLeft} days`,
      message: 'Renew now to avoid service interruption',
      meta: { planName, daysLeft, actionType: 'renew' },
    };

    try {
      // Persist to database
      await this.notificationsService.persistNotificationData({
        userId,
        type: PaymentNotificationEvent.SUBSCRIPTION_EXPIRING,
        title: `${planName} expires in ${daysLeft} days`,
        message: 'Renew now to avoid service interruption',
        meta: { planName, daysLeft, actionType: 'renew' },
      });

      // Enqueue to job queue for real-time delivery
      await this.notificationsService.addNotification(notificationData);

      this.logger.log(
        `✓ Subscription expiring notification sent: ${userId} (${planName}, ${daysLeft} days left)`,
      );
    } catch (error: any) {
      this.logger.error(
        `✗ Error sending subscription expiring notification: ${error.message}`,
      );
      throw error;
    }
  }
}
