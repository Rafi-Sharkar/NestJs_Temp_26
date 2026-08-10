import { Processor, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { BaseNotificationProcessor } from './base.processor';
import { NotificationGateway } from '../gateway/notifications.gateway';

import { FcmService } from '../fcm.service';

const NOTIFICATION_QUEUE_NAME = 'notification-queue';

@Processor(NOTIFICATION_QUEUE_NAME)
@Injectable()
export class PaymentNotificationProcessor extends BaseNotificationProcessor {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly gateway: NotificationGateway,
    protected readonly fcmService: FcmService,
  ) {
    super(prisma, gateway, fcmService, 'PaymentNotificationProcessor');
  }

  async process(job: Job) {
    return super.process(job);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`✓ Payment job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`✗ Payment job ${job.id} failed: ${err.message}`);
  }

  @OnWorkerEvent('error')
  onError(error: Error) {
    this.logger.error(`✗ Processor error: ${error.message}`);
  }
}
