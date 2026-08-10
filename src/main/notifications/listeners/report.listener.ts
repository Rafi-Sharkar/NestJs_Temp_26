import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from '../notifications.service';
import { ReportNotificationEvent } from '../events/report.events';

@Injectable()
export class ReportListener {
  private readonly logger = new Logger(ReportListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent(ReportNotificationEvent.REPORT_ACCEPTED)
  async handleReportAccepted(payload: {
    reporterId: string;
    reportId: string;
    title: string;
    message: string;
  }) {
    try {
      this.logger.log(`Handling report accepted event for ${payload.reportId}`);

      await this.notificationsService.addNotification({
        type: ReportNotificationEvent.REPORT_ACCEPTED,
        recipientId: payload.reporterId,
        title: payload.title,
        message: payload.message,
        meta: { reportId: payload.reportId },
      });
    } catch (error) {
      this.logger.error(`Failed to handle report accepted event: ${error}`);
    }
  }

  @OnEvent(ReportNotificationEvent.CONTACT_SUPPORT_ACCEPTED)
  async handleContactSupportAccepted(payload: {
    reporterId: string;
    supportId: string;
    title: string;
    message: string;
  }) {
    try {
      this.logger.log(`Handling contact support accepted event for ${payload.supportId}`);

      await this.notificationsService.addNotification({
        type: ReportNotificationEvent.CONTACT_SUPPORT_ACCEPTED,
        recipientId: payload.reporterId,
        title: payload.title,
        message: payload.message,
        meta: { supportId: payload.supportId },
      });
    } catch (error) {
      this.logger.error(`Failed to handle contact support accepted event: ${error}`);
    }
  }
}
