/**
 * Payment Event Payloads - Type definitions for payment notification event data
 */

/**
 * Checkout Session Completed Payload
 * Triggered when a Stripe checkout session is completed
 */
export interface CheckoutSessionCompletedPayload {
  sessionId: string;
  userId: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  durationMonths: number;
  startDate: Date;
  endDate: Date;
  paymentIntentId?: string;
  customerEmail?: string;
}

/**
 * Payment Intent Succeeded Payload
 * Triggered when a payment intent succeeds
 */
export interface PaymentIntentSucceededPayload {
  paymentIntentId: string;
  userId: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  status: 'succeeded';
}

/**
 * Payment Intent Failed Payload
 * Triggered when a payment intent fails
 */
export interface PaymentIntentFailedPayload {
  paymentIntentId: string;
  userId: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  status: 'failed';
  failureReason: string;
  lastPaymentError?: {
    message: string;
    code?: string;
    type?: string;
  };
}

/**
 * Checkout Session Async Payment Failed Payload
 * Triggered when async payment in checkout fails
 */
export interface CheckoutSessionAsyncPaymentFailedPayload {
  sessionId: string;
  userId: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  failureReason: string;
}

/**
 * Payment Create Event Payload
 * Custom event emitted after successful payment/subscription creation
 */
export interface PaymentCreatePayload {
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  subscriptionId: string;
  userId: string;
  planId: string;
  planName: string;
  price: number;
  createdAt: Date;
  recipients: Array<{
    id: string;
    email: string;
  }>;
}

/**
 * Subscription Expiring Payload
 * Custom event triggered when subscription is about to expire
 */
export interface SubscriptionExpiringPayload {
  subscriptionId: string;
  userId: string;
  planId: string;
  planName: string;
  expiryDate: Date;
  daysLeft: number;
  actionType: 'renew';
}

/**
 * Subscription Expired Payload
 * Custom event triggered when subscription expires
 */
export interface SubscriptionExpiredPayload {
  subscriptionId: string;
  userId: string;
  planId: string;
  planName: string;
  expiredDate: Date;
  actionType: 'upgrade' | 'reactivate';
}

/**
 * Subscription Renewed Payload
 * Custom event triggered when subscription is renewed
 */
export interface SubscriptionRenewedPayload {
  subscriptionId: string;
  userId: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  renewalDate: Date;
  nextRenewalDate: Date;
  actionType: 'renewed';
}

/**
 * Wallet Low Payload
 * Custom event triggered when user's wallet balance is low
 */
export interface WalletLowPayload {
  userId: string;
  currentBalance: number;
  thresholdAmount: number;
  currency: string;
  actionType: 'topup';
}

/**
 * Union type for all payment event payloads
 */
export type PaymentEventPayload =
  | CheckoutSessionCompletedPayload
  | PaymentIntentSucceededPayload
  | PaymentIntentFailedPayload
  | CheckoutSessionAsyncPaymentFailedPayload
  | PaymentCreatePayload
  | SubscriptionExpiringPayload
  | SubscriptionExpiredPayload
  | SubscriptionRenewedPayload
  | WalletLowPayload;
