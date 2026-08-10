import { Global, Module } from '@nestjs/common';
import { FileService } from './services/file.service';
import { SuperAdminService } from './services/super-admin.service';
import { PermissionsSeedService } from './services/permissions-seed.service';
import { GlobalSettingsSeedService } from './services/global-settings-seed.service';

@Global()
@Module({
  imports: [],
  providers: [
    SuperAdminService,
    FileService,
    PermissionsSeedService,
    GlobalSettingsSeedService,
  ],
})
export class SeedModule {}
