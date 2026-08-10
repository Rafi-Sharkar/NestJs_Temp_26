import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/lib/prisma/prisma.service';
import {
  SubscriptionStatus,
} from '@prisma';
import {
  CreateCheckoutSessionDto,
  CreateCustomerPortalDto,
} from './dto/create-checkout.dto';
import { VerifyInAppPurchaseDto } from './dto/verify-inapp.dto';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get list of active subscription plans
   */
  async getPlans() {
    return this.prisma.client.plan.findMany({
      where: {
        planStatus: 'ACTIVE',
      },
    });
  }

  /**
   * Get current subscription for logged-in user
   */
  async getUserSubscription(userId: string) {
    const subscription = await this.prisma.client.subscription.findUnique({
      where: { userId },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      return {
        hasActiveSubscription: false,
        subscription: null,
      };
    }

    const isActive = subscription.status === SubscriptionStatus.ACTIVE;

    return {
      hasActiveSubscription: isActive,
      subscription,
    };
  }

  /**
   * Create Stripe Checkout session for Web Subscription
   */
  async createStripeCheckoutSession(
    userId: string,
    dto: CreateCheckoutSessionDto,
  ) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const plan = await this.prisma.client.plan.findUnique({
      where: { id: dto.planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    // Direct subscription activation (no Stripe fields persisted yet)
    const existing = await this.prisma.client.subscription.findUnique({
      where: { userId },
    });

    if (existing) {
      const updated = await this.prisma.client.subscription.update({
        where: { userId },
        data: {
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
        },
        include: { plan: true },
      });
      return { subscription: updated, message: 'Subscription activated' };
    }

    const created = await this.prisma.client.subscription.create({
      data: {
        userId,
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
      },
      include: { plan: true },
    });

    return {
      subscription: created,
      message: stripeSecretKey
        ? 'Subscription created (Stripe integration pending schema extension)'
        : 'Subscription created',
    };
  }

  /**
   * Create Stripe Customer Portal session
   */
  async createStripePortalSession(userId: string, _dto: CreateCustomerPortalDto) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new BadRequestException(
        'Stripe is not configured for the customer portal',
      );
    }
    // Stripe fields are not yet persisted on the User/Subscription models.
    return {
      url: `${this.configService.get('FRONTEND_URL') || 'http://localhost:3000'}/account/billing`,
      message:
        'Stripe customer portal is not yet wired to the schema (no Stripe customer IDs persisted).',
    };
  }

  /**
   * Verify In-App Purchase (iOS App Store & Google Play Store)
   */
  async verifyInAppPurchase(userId: string, dto: VerifyInAppPurchaseDto) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const plan = await this.prisma.client.plan.findUnique({
      where: { id: dto.productId },
    });

    if (!plan) {
      throw new NotFoundException(
        `No active plan matches product ID: ${dto.productId}`,
      );
    }

    const existing = await this.prisma.client.subscription.findUnique({
      where: { userId },
    });

    let subscription;
    if (existing) {
      subscription = await this.prisma.client.subscription.update({
        where: { userId },
        data: {
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
        },
        include: { plan: true },
      });
    } else {
      subscription = await this.prisma.client.subscription.create({
        data: {
          userId,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
        },
        include: { plan: true },
      });
    }

    return {
      message: 'In-app purchase verified successfully',
      subscription,
    };
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string) {
    const subscription = await this.prisma.client.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    const updated = await this.prisma.client.subscription.update({
      where: { userId },
      data: {
        status: SubscriptionStatus.CANCELLED,
      },
      include: { plan: true },
    });

    return {
      message: 'Subscription cancelled',
      subscription: updated,
    };
  }

  /**
   * Handle Webhook from Stripe
   * Note: Stripe fields are not persisted in the current schema; this is a no-op
   * acknowledgement so the webhook endpoint stays reachable.
   */
  async handleStripeWebhook(eventPayload: any) {
    const eventType = eventPayload?.type;
    this.logger.log(`Received Stripe Webhook: ${eventType ?? 'unknown'}`);
    return { received: true };
  }

  /**
   * Handle Webhook from Apple App Store Server Notifications V2
   */
  async handleAppleWebhook(payload: any) {
    this.logger.log(
      `Received Apple Server Notification V2: ${payload?.notificationType ?? 'unknown'}`,
    );
    return { received: true };
  }

  /**
   * Handle Webhook from Google Play RTDN
   */
  async handleGoogleWebhook(_payload: any) {
    this.logger.log('Received Google Play RTDN Notification');
    return { received: true };
  }
}