import { UserRole, UserType } from '@prisma';
import { successResponse, TResponse } from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { AuthMailService } from '@/lib/mail/services/auth-mail.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { AuthUtilsService } from '@/lib/utils/services/auth-utils.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { RegisterDto } from '../dto/register.dto';

@Injectable()
export class AuthRegisterService {
  private readonly logger = new Logger(AuthRegisterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authMailService: AuthMailService,
    private readonly utils: AuthUtilsService,
    @Inject('STRIPE_CLIENT') private readonly stripe: Stripe | null,
  ) {}

  @HandleError('Registration failed', 'User')
  async register(dto: RegisterDto): Promise<TResponse<any>> {
    const { email, password, fullName } = dto;

    // Check if user email already exists
    const existingUser = await this.prisma.client.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new AppError(400, 'User already exists with this email');
    }

    // Generate unique name from full name
    const baseName = fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
    let uniqueName = baseName;
    let isUnique = false;
    let counter = 1;

    while (!isUnique) {
      const existingName = await this.prisma.client.user.findUnique({
        where: { name: uniqueName },
      });
      if (!existingName) {
        isUnique = true;
      } else {
        uniqueName = `${baseName}${counter}`;
        counter++;
      }
    }

    // Create user
    const newUser = await this.prisma.client.user.create({
      data: {
        email,
        fullName,
        name: uniqueName,
        password: await this.utils.hash(password),
        role: UserRole.USER,
        userType: UserType.NORMAL,
        isNormal: true,
        isVerified: false,
      },
    });

    // Create the Stripe customer eagerly so payment flows never have to do it later.
    // Non-fatal: skipped entirely when STRIPE_SECRET_KEY is not configured.
    let setupIntentClientSecret: string | null = null;
    if (this.stripe) {
      try {
        const customer = await this.stripe.customers.create({
          email: newUser.email,
          name: newUser.fullName ?? newUser.name,
          metadata: { userId: newUser.id },
        });
        newUser.customerIdStripe = customer.id;

        const setupIntent = await this.stripe.setupIntents.create({
          customer: customer.id,
          automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
        });
        setupIntentClientSecret = setupIntent.client_secret;

        await this.prisma.client.user.update({
          where: { id: newUser.id },
          data: {
            customerIdStripe: customer.id,
            pendingSetupIntentId: setupIntent.id,
          },
        });
      } catch (err: any) {
        this.logger.warn(
          `Stripe customer/setup-intent creation failed for user ${newUser.id}: ${err.message}`,
        );
      }
    }

    // Generate OTP and save
    const otp = await this.utils.generateOTPAndSave(
      newUser.id,
      'EMAIL_VERIFICATION',
    );

    // Send verification email
    await this.authMailService.sendVerificationCodeEmail(
      email,
      otp.toString(),
      {
        subject: 'Verify your email',
        message:
          'Welcome to our platform! Your account has been successfully created.',
      },
    );

    // Return sanitized response
    return successResponse(
      {
        email: newUser.email,
        fullName: newUser.fullName,
        name: newUser.name,
        role: newUser.role,
        setupIntentClientSecret,
      },
      'Registration successful. OTP sent for verification',
    );
  }
}