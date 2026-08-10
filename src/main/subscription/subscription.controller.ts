import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
// The user-param decorator in this project is exported as `User`.
// We alias it to `GetUser` for readability at the call sites.
import { User as GetUser } from '@/common/decorators/user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { Public } from '@/core/jwt/jwt.decorator';
import {
  CreateCheckoutSessionDto,
  CreateCustomerPortalDto,
} from './dto/create-checkout.dto';
import { VerifyInAppPurchaseDto } from './dto/verify-inapp.dto';
import { SubscriptionService } from './subscription.service';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'Get all active subscription plans' })
  async getPlans() {
    return this.subscriptionService.getPlans();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get current user subscription details' })
  async getUserSubscription(@GetUser('id') userId: string) {
    return this.subscriptionService.getUserSubscription(userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('web/checkout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create Stripe checkout session for Web subscription' })
  async createCheckoutSession(
    @GetUser('id') userId: string,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    return this.subscriptionService.createStripeCheckoutSession(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('web/portal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create Stripe billing portal session for customer' })
  async createPortalSession(
    @GetUser('id') userId: string,
    @Body() dto: CreateCustomerPortalDto,
  ) {
    return this.subscriptionService.createStripePortalSession(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('in-app/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify In-App Purchase (iOS App Store & Google Play)' })
  async verifyInAppPurchase(
    @GetUser('id') userId: string,
    @Body() dto: VerifyInAppPurchaseDto,
  ) {
    return this.subscriptionService.verifyInAppPurchase(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel current user subscription' })
  async cancelSubscription(@GetUser('id') userId: string) {
    return this.subscriptionService.cancelSubscription(userId);
  }
}
