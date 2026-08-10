import { UserResponseDto } from '@/common/dto/user-response.dto';
import { successResponse, TResponse } from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { AuthMailService } from '@/lib/mail/services/auth-mail.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { UserCacheService } from '@/lib/redis/user-cache.service';
// import { TwilioService } from '@/lib/twilio/twilio.service';
import { AuthUtilsService } from '@/lib/utils/services/auth-utils.service';
import { Injectable } from '@nestjs/common';
import { OtpType, Prisma } from '@prisma';
import {
  ResendOtpDto,
  ResetPhoneOtpDto,
  VerifyOTPDto,
  VerifyPhoneOtpDto,
} from '../dto/otp.dto';

@Injectable()
export class AuthOtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly utils: AuthUtilsService,
    private readonly authMailService: AuthMailService,
    // private readonly twilioService: TwilioService,
    private readonly userCache: UserCacheService,
  ) {}

  @HandleError('Failed to resend OTP')
  async resendOtp({ email, type }: ResendOtpDto): Promise<TResponse<any>> {
    const user = await this.prisma.client.user.findUnique({ where: { email } });
    if (!user) throw new AppError(404, 'User not found');

    if (user.isVerified && type === OtpType.EMAIL_VERIFICATION) {
      throw new AppError(400, 'User is already verified');
    }

    await this.prisma.client.userOtp.deleteMany({
      where: {
        userId: user.id,
        type,
        expiresAt: { gt: new Date() },
      },
    });

    const otp = await this.utils.generateOTPAndSave(user.id, type);

    try {
      if (
        type === OtpType.EMAIL_VERIFICATION ||
        type === OtpType.PASSWORD_RESET ||
        type === OtpType.TWO_FACTOR_AUTH
      ) {
        await this.authMailService.sendVerificationCodeEmail(
          email,
          otp.toString(),
          {
            subject:
              type === OtpType.TWO_FACTOR_AUTH
                ? '2FA Verification Code'
                : 'Your OTP Code',
            message: `Here is your OTP code. It will expire in 5 minutes.`,
          },
        );
      }
    } catch {
      await this.prisma.client.userOtp.deleteMany({
        where: { userId: user.id, type },
      });
      throw new AppError(
        500,
        'Failed to send OTP email. Please try again later.',
      );
    }

    return successResponse(null, `${type} OTP sent successfully`);
  }

  @HandleError('OTP verification failed', 'User')
  async verifyOTP(
    dto: VerifyOTPDto,
    typeOverride?: OtpType,
    ip: string = '0.0.0.0',
  ): Promise<TResponse<any>> {
    const { email, otp } = dto;
    const type = dto.type || typeOverride || OtpType.EMAIL_VERIFICATION;

    const user = await this.prisma.client.user.findUnique({ where: { email } });
    if (!user) throw new AppError(404, 'User not found');

    let userOtp = await this.prisma.client.userOtp.findFirst({
      where: { userId: user.id, type },
      orderBy: { createdAt: 'desc' },
    });

    if (!userOtp && !dto.type && !typeOverride) {
      userOtp = await this.prisma.client.userOtp.findFirst({
        where: { userId: user.id, type: OtpType.TWO_FACTOR_AUTH },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!userOtp)
      throw new AppError(400, 'OTP is not set. Please request a new one.');

    if (userOtp.expiresAt < new Date()) {
      await this.prisma.client.userOtp.delete({ where: { id: userOtp.id } });
      throw new AppError(400, 'OTP has expired. Please request a new one.');
    }

    const isCorrectOtp = await this.utils.compare(otp, userOtp.code);
    if (!isCorrectOtp) throw new AppError(400, 'Invalid OTP');

    await this.prisma.client.userOtp.deleteMany({
      where: { userId: user.id, type: userOtp.type },
    });

    const updateData: any = {
      lastLoginAt: new Date(),
      lastActiveAt: new Date(),
    };
    if (userOtp.type === OtpType.EMAIL_VERIFICATION) {
      updateData.isVerified = true;
      if (user.status === 'INACTIVE') {
        updateData.status = 'ACTIVE';
      }
    }

    const updatedUser = await this.prisma.client.user.update({
      where: { id: user.id },
      data: updateData,
      include: {
        profilePhoto: true,
      },
    });

    // Invalidate cache after user status update
    await this.userCache.invalidateUserCache(updatedUser.id, email);

    // The Session table is intentionally absent from the current schema.
    // We mint a synthetic sessionId so JWT payloads keep a stable shape.
    const sessionId = `${updatedUser.id}-${Date.now()}`;

    const token = await this.utils.generateTokenPairAndSave({
      email,
      role: updatedUser.role,
      sub: updatedUser.id,
      userType: updatedUser.userType ?? undefined,
      sessionId,
    });

    // Cache the user profile
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
    );

    // Reset login attempts
    await this.userCache.resetLoginAttempts(email);

    return successResponse(
      {
        user: await this.utils.sanitizeUser<UserResponseDto>(
          updatedUser as any,
        ),
        token,
      },
      'OTP verified successfully',
    );
  }

  // @HandleError('Phone OTP verification failed', 'User')
  // async verifyPhoneOtp(dto: VerifyPhoneOtpDto): Promise<TResponse<any>> {
  //   const { phoneNumber, otp } = dto;

  //   const user = await this.prisma.client.user.findUnique({ where: { phoneNumber } });
  //   if (!user) throw new AppError(404, 'User not found');

  //   const userOtp = await this.prisma.client.userOtp.findFirst({
  //     where: { userId: user.id, type: OtpType.PHONE_VERIFICATION },
  //     orderBy: { createdAt: 'desc' },
  //   });

  //   if (!userOtp) throw new AppError(400, 'OTP is not set. Please request a new one.');

  //   if (userOtp.expiresAt < new Date()) {
  //     await this.prisma.client.userOtp.delete({ where: { id: userOtp.id } });
  //     throw new AppError(400, 'OTP has expired. Please request a new one.');
  //   }

  //   const isCorrectOtp = await this.utils.compare(otp, userOtp.code);
  //   if (!isCorrectOtp) throw new AppError(400, 'Invalid OTP');

  //   await this.prisma.client.userOtp.deleteMany({
  //     where: { userId: user.id, type: OtpType.PHONE_VERIFICATION },
  //   });

  //   const updatedUser = await this.prisma.client.user.update({
  //     where: { id: user.id },
  //     data: {
  //       isPhoneVerified: true,
  //       isVerified: true,
  //       lastLoginAt: new Date(),
  //       lastActiveAt: new Date(),
  //     },
  //   });

  //   const token = await this.utils.generateTokenPairAndSave({
  //     sub: updatedUser.id,
  //     email: updatedUser.email,
  //     role: updatedUser.role,
  //   });

  //   return successResponse(
  //     {
  //       user: await this.utils.sanitizeUser<UserResponseDto>(updatedUser as any),
  //       token,
  //     },
  //     'Phone OTP verified successfully',
  //   );
  // }

  // @HandleError('Failed to resend phone OTP')
  // async resendPhoneOtp(dto: ResetPhoneOtpDto): Promise<TResponse<any>> {
  //   const { phoneNumber, type } = dto;

  //   const user = await this.prisma.client.user.findUnique({ where: { phoneNumber } });
  //   if (!user) throw new AppError(404, 'User not found');

  //   if (user.isPhoneVerified && type === OtpType.PHONE_VERIFICATION) {
  //     throw new AppError(400, 'User phone is already verified');
  //   }

  //   await this.prisma.client.userOtp.deleteMany({
  //     where: {
  //       userId: user.id,
  //       type,
  //       expiresAt: { gt: new Date() },
  //     },
  //   });

  //   const otp = await this.utils.generateOTPAndSave(user.id, type);

  //   try {
  //     await this.twilioService.sendOtpSms(phoneNumber, otp);
  //   } catch {
  //     await this.prisma.client.userOtp.deleteMany({
  //       where: { userId: user.id, type },
  //     });
  //     throw new AppError(500, 'Failed to send OTP SMS. Please try again later.');
  //   }

  //   return successResponse(null, `Phone ${type} OTP sent successfully`);
  // }
}
