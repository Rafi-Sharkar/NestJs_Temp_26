import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { successResponse, TResponse } from '@/common/utils/response.util';

@Injectable()
export class AdminAuthChangePasswordService {
  constructor(private readonly prisma: PrismaService) {}

  @HandleError('Failed to change password', 'Admin Auth')
  async changePasswordFirstLogin(
    userId: string,
    newPassword: string,
  ): Promise<TResponse<any>> {
    // Find user
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Validate password length
    if (newPassword.length < 6) {
      throw new AppError(400, 'Password must be at least 6 characters long');
    }

    // Hash new password
    const crypto = require('crypto');
    const hashedPassword = await crypto
      .createHash('sha256')
      .update(newPassword)
      .digest('hex');

    // Update password
    await this.prisma.client.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return successResponse(
      { id: userId, email: user.email },
      'Password changed successfully',
    );
  }
}
