import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class DevToolService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllUsers() {
    return this.prisma.client.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isVerified: true,
        status: true,
      },
    });
  }

  async deleteUserById(userId: string) {
    const existingUser = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    // The User model cascades to its real children via ON DELETE CASCADE
    // (otps, refresh_tokens, password_reset_tokens, notifications, subscriptions,
    // notification-toggle, conversation members, messages, calls, etc.)
    await this.prisma.client.user.delete({
      where: { id: userId },
    });

    return {
      statusCode: 200,
      message: `User with ID "${userId}" and all related data deleted successfully`,
    };
  }
}