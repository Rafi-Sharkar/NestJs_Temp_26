import { ENVEnum } from '@/common/enum/env.enum';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { AuthUtilsService } from '@/lib/utils/services/auth-utils.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma';

@Injectable()
export class SuperAdminService implements OnModuleInit {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authUtils: AuthUtilsService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): Promise<void> {
    return this.seedSuperAdminUser();
  }

  async seedSuperAdminUser(): Promise<void> {
    const superAdminEmail = this.configService.getOrThrow<string>(
      ENVEnum.SUPER_ADMIN_EMAIL,
    );
    const superAdminPass = this.configService.getOrThrow<string>(
      ENVEnum.SUPER_ADMIN_PASS,
    );

    const superAdminExists = await this.prisma.client.user.findFirst({
      where: {
        email: superAdminEmail,
      },
    });

    // * create super admin
    if (!superAdminExists) {
      // Generate a unique display name from the email local-part so we don't
      // collide with any stale "Super Admin" rows left over from previous runs.
      const baseName = superAdminEmail.split('@')[0].toLowerCase();
      let uniqueName = baseName;
      let counter = 1;
      while (
        await this.prisma.client.user.findUnique({
          where: { name: uniqueName },
        })
      ) {
        uniqueName = `${baseName}${counter}`;
        counter++;
      }

      await this.prisma.client.user.create({
        data: {
          name: uniqueName,
          email: superAdminEmail,
          password: await this.authUtils.hash(superAdminPass),
          role: UserRole.SUPER_ADMIN,
          isVerified: true,
          lastLoginAt: new Date(),
          lastActiveAt: new Date(),
        },
      });
      this.logger.log(
        `[CREATE] Super Admin user created with email: ${superAdminEmail}`,
      );
      return;
    }

    // * Log & update if super admin already exists
    await this.prisma.client.user.update({
      where: {
        email: superAdminEmail,
      },
      data: {
        isVerified: true,
        role: UserRole.SUPER_ADMIN,
        lastActiveAt: new Date(),
        lastLoginAt: new Date(),
      },
    });

    this.logger.log(
      `[UPDATE] Super Admin user updated with email: ${superAdminEmail}`,
    );
  }
}
