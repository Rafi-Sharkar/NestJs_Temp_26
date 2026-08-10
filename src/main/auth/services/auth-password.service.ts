import { successResponse, TResponse } from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { AuthMailService } from '@/lib/mail/services/auth-mail.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { UserCacheService } from '@/lib/redis/user-cache.service';
import { AuthUtilsService } from '@/lib/utils/services/auth-utils.service';
import { Injectable } from '@nestjs/common';
import { OtpType } from '@prisma';
import {
  ChangePasswordDto,
  ResetPasswordDto,
  VerifyPasswordOtpDto,
} from '../dto/password.dto';

@Injectable()
export class AuthPasswordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly utils: AuthUtilsService,
    private readonly mailService: AuthMailService,
    private readonly userCache: UserCacheService,
  ) {}

  @HandleError('Failed to change password')
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<TResponse<any>> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { password: true, email: true },
    });
    if (!user) throw new AppError(404, 'User not found');

    // If user registered via social login and has no password set
    if (!user.password) {
      const hashedPassword = await this.utils.hash(dto.newPassword);
      await this.prisma.client.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      // Invalidate cache after password set
      await this.userCache.invalidateUserCache(userId, user.email);

      return successResponse(null, 'Password set successfully');
    }

    // Normal users must provide current password
    if (!dto.password) throw new AppError(400, 'Current password is required');

    const isValid = await this.utils.compare(dto.password, user.password);
    if (!isValid) throw new AppError(400, 'Invalid current password');

    const hashedPassword = await this.utils.hash(dto.newPassword);
    await this.prisma.client.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Invalidate cache after password change
    await this.userCache.invalidateUserCache(userId, user.email);

    return successResponse(null, 'Password updated successfully');
  }

  @HandleError('Failed to send password reset email')
  async forgotPassword(email: string): Promise<TResponse<any>> {
    const trimmedEmail = email.trim().toLowerCase(); // Normalize email
    const user = await this.prisma.client.user.findUnique({
      where: { email: trimmedEmail },
    });
    if (!user) throw new AppError(404, 'User not found');

    // Delete existing unexpired RESET OTPs
    await this.prisma.client.userOtp.deleteMany({
      where: {
        userId: user.id,
        type: OtpType.PASSWORD_RESET,
        expiresAt: { gt: new Date() },
      },
    });

    // Generate OTP and save
    const otp = await this.utils.generateOTPAndSave(
      user.id,
      OtpType.PASSWORD_RESET,
    );

    // Send OTP email
    await this.mailService.sendResetPasswordCodeEmail(
      trimmedEmail,
      otp.toString(),
    );

    return successResponse(null, 'Password reset OTP sent');
  }

  @HandleError('Failed to verify password reset OTP')
  async verifyPasswordOtp(
    dto: VerifyPasswordOtpDto,
  ): Promise<TResponse<{ token: string }>> {
    const { otp, email } = dto;
    const trimmedOtp = otp.trim().toLowerCase(); // Trim and lowercase
    const trimmedEmail = email.trim().toLowerCase(); // Trim and lowercase email

    const user = await this.prisma.client.user.findUnique({
      where: { email: trimmedEmail },
    });
    if (!user) throw new AppError(404, 'User not found');

    // Find latest RESET OTP
    const userOtp = await this.prisma.client.userOtp.findFirst({
      where: { userId: user.id, type: OtpType.PASSWORD_RESET },
      orderBy: { createdAt: 'desc' },
    });

    if (!userOtp)
      throw new AppError(400, 'OTP is not set. Please request a new one.');
    if (userOtp.expiresAt < new Date()) {
      await this.prisma.client.userOtp.delete({ where: { id: userOtp.id } });
      throw new AppError(401, 'OTP has expired. Please request a new one.');
    }

    const isValid = await this.utils.compare(trimmedOtp, userOtp.code);
    if (!isValid) throw new AppError(403, 'Invalid OTP');

    // Generate a unique reset token (valid for 30 minutes)
    const resetToken = this.utils.generateRandomToken();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Delete existing unexpired tokens for this user
    await this.prisma.client.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        expiresAt: { gt: new Date() },
      },
    });

    // Save the reset token
    const savedToken = await this.prisma.client.passwordResetToken.create({
      data: {
        token: resetToken,
        userId: user.id,
        expiresAt,
      },
    });

    // Delete the OTP after successful verification
    await this.prisma.client.userOtp.delete({ where: { id: userOtp.id } });

    return successResponse(
      { token: savedToken.token },
      'OTP verified successfully',
    );
  }

  @HandleError('Failed to reset password')
  async resetPassword(dto: ResetPasswordDto): Promise<TResponse<any>> {
    const { token, email, newPassword } = dto;
    const trimmedToken = token.trim(); // Trim whitespace from token
    const trimmedEmail = email.trim().toLowerCase(); // Normalize email

    const user = await this.prisma.client.user.findUnique({
      where: { email: trimmedEmail },
    });
    if (!user) throw new AppError(404, 'User not found');

    // Find and verify the reset token using passwordResetToken model
    const resetToken = await this.prisma.client.passwordResetToken.findUnique({
      where: { token: trimmedToken },
    });

    if (!resetToken)
      throw new AppError(
        400,
        'Invalid reset token. Please request a new password reset.',
      );

    if (resetToken.userId !== user.id)
      throw new AppError(403, 'Invalid token for this user.');

    if (resetToken.expiresAt < new Date()) {
      await this.prisma.client.passwordResetToken.delete({
        where: { id: resetToken.id },
      });
      throw new AppError(
        401,
        'Reset token has expired. Please request a new password reset.',
      );
    }

    // Hash new password
    const hashedPassword = await this.utils.hash(newPassword);

    // Update password and delete the reset token
    await this.prisma.client.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });
    await this.prisma.client.passwordResetToken.delete({
      where: { id: resetToken.id },
    });

    // Invalidate cache after password reset
    await this.userCache.invalidateUserCache(user.id, trimmedEmail);

    // Send confirmation email
    await this.mailService.sendPasswordResetConfirmationEmail(trimmedEmail);

    return successResponse(null, 'Password reset successfully');
  }
}
