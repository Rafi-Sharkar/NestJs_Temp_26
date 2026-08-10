/**
 * Payment Events - All payment-related notification types
 * Based on actual Stripe webhook events and custom payment events
 */
export enum PaymentNotificationEvent {
  // Stripe Checkout Events
  CHECKOUT_SESSION_COMPLETED = 'checkout.session.completed',
  CHECKOUT_SESSION_ASYNC_PAYMENT_FAILED = 'checkout.session.async_payment_failed',

  // Stripe Payment Intent Events
  PAYMENT_INTENT_SUCCEEDED = 'payment_intent.succeeded',
  PAYMENT_INTENT_PAYMENT_FAILED = 'payment_intent.payment_failed',

  // Custom Payment Events
  PAYMENT_CREATE = 'payment.create',

  // Business Logic Events
  SUBSCRIPTION_EXPIRING = 'subscription.expiring',
  SUBSCRIPTION_EXPIRED = 'subscription.expired',
  SUBSCRIPTION_RENEWED = 'subscription.renewed',
  WALLET_LOW = 'wallet.low',
}
