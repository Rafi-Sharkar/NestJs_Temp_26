import { Module } from '@nestjs/common';
import { S3Service } from './service/s3.service';
import { UploadService } from './service/upload.service';
import { UploadController } from './upload.controller';

@Module({
  controllers: [UploadController],
  providers: [UploadService, S3Service],
  exports: [S3Service, UploadService],
})
export class UploadModule {}
