import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/core/jwt/jwt.decorator';
import { SubscriptionService } from './subscription.service';

@ApiTags('Subscription Webhooks')
@Controller('subscriptions/webhook')
export class SubscriptionWebhookController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Public()
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe Webhook Listener' })
  async handleStripeWebhook(@Body() payload: any) {
    return this.subscriptionService.handleStripeWebhook(payload);
  }

  @Public()
  @Post('apple')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apple App Store Server Notifications V2 Webhook Listener' })
  async handleAppleWebhook(@Body() payload: any) {
    return this.subscriptionService.handleAppleWebhook(payload);
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Google Play RTDN Webhook Listener' })
  async handleGoogleWebhook(@Body() payload: any) {
    return this.subscriptionService.handleGoogleWebhook(payload);
  }
}
