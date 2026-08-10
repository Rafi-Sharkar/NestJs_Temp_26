import { successResponse } from '@/common/utils/response.util';
import { ENVEnum } from '@/common/enum/env.enum';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { AuthUtilsService } from '@/lib/utils/services/auth-utils.service';
import { UserCacheService } from '@/lib/redis/user-cache.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthGetProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authUtils: AuthUtilsService,
    private readonly userCache: UserCacheService,
    private readonly configService: ConfigService,
  ) {}

  @HandleError("Can't get user profile")
  async getProfile(userId: string) {
    const enableCache =
      this.configService.get(ENVEnum.ENABLE_CACHE, 'true') === 'true';

    // Try to get from cache first (only if cache is enabled)
    if (enableCache) {
      const cachedUser = await this.userCache.getCachedUserProfile(userId);
      if (cachedUser) {
        this.userCache.logCacheHit(userId);
        return successResponse(cachedUser, 'User data fetched from cache');
      }
    }

    this.userCache.logCacheMiss(userId);
    const user = await this.findUserBy('id', userId);

    // Cache the user profile for future requests (only if cache is enabled)
    if (enableCache && user.data) {
      await this.userCache.cacheUserProfile(userId, user.data, 3600); // Cache for 1 hour
    }

    return user;
  }

  private async findUserBy(key: 'id' | 'email', value: string) {
    const where: any = {};
    where[key] = value;

    const user = await this.prisma.client.user.findUnique({
      where,
      include: {
        profilePhoto: true,
        notifications: true,
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { notifications, subscription, ...mainUser } = user as any;
    const sanitizedUser = await this.authUtils.sanitizeUser(mainUser as any);

    const data = {
      ...sanitizedUser,
      notifications,
      subscription,
    };

    return successResponse(data, 'User data fetched successfully');
  }
}
