import { Module } from '@nestjs/common';
import { VpsFileUploadController } from './vps-fileupload.controller';
import { VpsFileUploadService } from './vps-fileupload.service';

@Module({
  controllers: [VpsFileUploadController],
  providers: [VpsFileUploadService],
})
export class VpsFileUploadModule {}
