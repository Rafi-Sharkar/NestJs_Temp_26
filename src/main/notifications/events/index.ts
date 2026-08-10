/**
 * All notification event types - unified
 */
import { PaymentNotificationEvent } from './payment.events';
import { SocialNotificationEvent } from './social.events';
import { ProposalNotificationEvent } from './proposal.events';
import { SeedNotificationEvent } from './seed.events';
import { CollaborationNotificationEvent } from './collaboration.events';
import { ReportNotificationEvent } from './report.events';

export { PaymentNotificationEvent } from './payment.events';
export { SocialNotificationEvent } from './social.events';
export { ProposalNotificationEvent } from './proposal.events';
export { SeedNotificationEvent } from './seed.events';
export { CollaborationNotificationEvent } from './collaboration.events';
export { ReportNotificationEvent } from './report.events';
export type {
  PaymentEventPayload,
  CheckoutSessionCompletedPayload,
  PaymentIntentSucceededPayload,
  PaymentIntentFailedPayload,
  CheckoutSessionAsyncPaymentFailedPayload,
  PaymentCreatePayload,
  SubscriptionExpiringPayload,
  SubscriptionExpiredPayload,
  SubscriptionRenewedPayload,
  WalletLowPayload,
} from './payment.payload';

export type NotificationEventType =
  | PaymentNotificationEvent
  | SocialNotificationEvent
  | ProposalNotificationEvent
  | SeedNotificationEvent
  | CollaborationNotificationEvent
  | ReportNotificationEvent;
