import { successResponse, TResponse } from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { AuthMailService } from '@/lib/mail/services/auth-mail.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { AuthUtilsService } from '@/lib/utils/services/auth-utils.service';
import { UserCacheService } from '@/lib/redis/user-cache.service';
import { Injectable } from '@nestjs/common';
import { OtpType } from '@prisma';
import { LoginDto } from '../dto/login.dto';
import { UpdateDeviceInfoDto } from '../dto/update-device-info.dto';

@Injectable()
export class AuthLoginService {
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_TIME = 900; // 15 minutes in seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly authMailService: AuthMailService,
    private readonly utils: AuthUtilsService,
    private readonly userCache: UserCacheService,
  ) {}

  @HandleError('Login failed', 'User')
  async login(dto: LoginDto, ip: string = '0.0.0.0'): Promise<TResponse<any>> {
    const { email, password } = dto;

    // Check login attempts (rate limiting)
    const loginAttempts = await this.userCache.getLoginAttempts(email);
    if (loginAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      throw new AppError(
        429,
        `Too many login attempts. Please try again in ${this.LOCKOUT_TIME} seconds.`,
      );
    }

    const user = await this.prisma.client.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Increment failed attempts
      await this.userCache.incrementLoginAttempts(email, this.LOCKOUT_TIME);
      throw new AppError(404, 'User not found');
    }

    const isPasswordCorrect = await this.utils.compare(password, user.password);
    if (!isPasswordCorrect) {
      // Increment failed attempts
      await this.userCache.incrementLoginAttempts(email, this.LOCKOUT_TIME);
      throw new AppError(400, 'Invalid password');
    }

    // ------------------- Check Email verification----------------
    if (!user.isVerified) {
      const otp = await this.utils.generateOTPAndSave(
        user.id,
        OtpType.EMAIL_VERIFICATION,
      );

      // Store OTP in Redis cache as well
      await this.userCache.storeOTP(
        user.id,
        otp.toString(),
        OtpType.EMAIL_VERIFICATION,
      );

      await this.authMailService.sendVerificationCodeEmail(
        user.email,
        otp.toString(),
      );

      return successResponse(
        { email: user.email },
        'Your email is not verified. A new OTP has been sent to your email.',
      );
    }

    // --------------Regular login---------------------------
    const updatedUser = await this.prisma.client.user.update({
      where: { email },
      data: {
        lastLoginAt: new Date(),
        lastActiveAt: new Date(),
      },
      include: {
        profilePhoto: true,
      },
    });

    // The Session table is intentionally absent from the current schema.
    // We mint a synthetic sessionId from the user id + timestamp so JWT
    // payloads keep a stable shape for clients.
    const sessionId = `${updatedUser.id}-${Date.now()}`;

    // Generate token pair with sessionId
    const token = await this.utils.generateTokenPairAndSave({
      email,
      role: updatedUser.role,
      sub: updatedUser.id,
      userType: updatedUser.userType ?? undefined,
      sessionId,
    });

    // Cache the user profile after successful login
    await this.userCache.cacheUserProfile(
      updatedUser.id,
      {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        userType: updatedUser.userType ?? undefined,
        profilePhoto: updatedUser.profilePhoto,
      },
      3600,
    ); // Cache for 1 hour

    // Reset login attempts on successful login
    await this.userCache.resetLoginAttempts(email);

    console.log(`✅ User logged in successfully: ${updatedUser.email}`);

    const sanitizedUser = await this.utils.sanitizeUser(updatedUser as any);

    return successResponse(
      {
        user: sanitizedUser,
        token,
      },
      'Logged in successfully',
    );
  }

  @HandleError('Updating device info failed', 'Session')
  async updateDeviceInfo(
    sessionId: string,
    dto: UpdateDeviceInfoDto,
  ): Promise<TResponse<any>> {
    // Sessions are not persisted in the current schema. This is a no-op that
    // simply acknowledges the call so existing clients do not break.
    return successResponse(
      { sessionId, ...dto },
      'Device info acknowledged (sessions are not persisted)',
    );
  }
}