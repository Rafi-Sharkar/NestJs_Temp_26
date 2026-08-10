import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from '../notifications.service';
import { ProposalNotificationEvent } from '../events/proposal.events';

@Injectable()
export class ProposalNotificationListener {
  private readonly logger = new Logger(ProposalNotificationListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  async notifyProposalReminder(
    userId: string,
    proposalTitle: string,
    proposalId: string,
    startDate: Date,
  ) {
    const notificationData = {
      type: ProposalNotificationEvent.PROPOSAL_REMINDER,
      recipientId: userId,
      title: 'Upcoming Proposal Reminder',
      message: `The proposal "${proposalTitle}" is starting soon on ${startDate.toLocaleDateString()}.`,
      meta: { proposalTitle, proposalId, startDate },
    };

    try {
      await this.notificationsService.addNotification(notificationData);
    } catch (error: any) {
      this.logger.error(
        `Error sending proposal reminder notification: ${error.message}`,
      );
    }
  }

  async notifyProposalCancelled(
    userId: string,
    proposalTitle: string,
    proposalId: string,
  ) {
    const notificationData = {
      type: ProposalNotificationEvent.PROPOSAL_CANCELLED,
      recipientId: userId,
      title: 'Proposal Cancelled',
      message: `The proposal "${proposalTitle}" has been cancelled.`,
      meta: { proposalTitle, proposalId },
    };

    try {
      await this.notificationsService.addNotification(notificationData);
    } catch (error: any) {
      this.logger.error(
        `Error sending proposal cancelled notification: ${error.message}`,
      );
    }
  }
}
