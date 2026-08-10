import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { UserCacheService } from '@/lib/redis/user-cache.service';
import { getFirebaseAdmin } from '@/lib/firebase/firebase.config';
import { successResponse } from '@/common/utils/response.util';

@Injectable()
export class AuthDeleteUserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userCache: UserCacheService,
  ) {}

  async deleteUser(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // The User model cascades to its real children via ON DELETE CASCADE
    // (otps, refresh_tokens, password_reset_tokens, notifications, subscriptions,
    // notification-toggle, conversation members, messages, calls, etc.)
    await this.prisma.client.user.delete({
      where: { id: userId },
    });

    // Invalidate user cache
    try {
      await this.userCache.invalidateUserCache(userId, user.email);
    } catch (error) {
      console.error('Failed to invalidate user cache:', error);
    }

    // Delete user from Firebase if firebase_uid exists
    if (user.firebase_uid) {
      try {
        const firebase = getFirebaseAdmin();
        if (firebase) {
          await firebase.auth().deleteUser(user.firebase_uid);
        }
      } catch (error) {
        console.error('Failed to delete user from Firebase Auth:', error);
      }
    }

    return successResponse(
      null,
      'User and all associated data deleted successfully',
    );
  }
}