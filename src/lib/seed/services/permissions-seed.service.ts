import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/lib/prisma/prisma.service';

@Injectable()
export class PermissionsSeedService implements OnModuleInit {
  private readonly logger = new Logger(PermissionsSeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('[SEED] Permissions seed completed');
  }
}
