import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/lib/prisma/prisma.service';

@Injectable()
export class GlobalSettingsSeedService implements OnModuleInit {
  private readonly logger = new Logger(GlobalSettingsSeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.seedGlobalSettings();
  }

  private async seedGlobalSettings(): Promise<void> {
    const client = this.prisma.client as any;
    const globalSettingsModel =
      client.globalSettings ||
      client.global_settings ||
      client.GlobalSettings;

    if (!globalSettingsModel) return;

    const existingSettings = await globalSettingsModel.findFirst();

    if (!existingSettings) {
      await globalSettingsModel.create({
        data: {
          autoDisableWhenStockZero: false,
        },
      });
      this.logger.log(
        '[SEED] GlobalSettings initialized with autoDisableWhenStockZero = false',
      );
    }
  }
}
