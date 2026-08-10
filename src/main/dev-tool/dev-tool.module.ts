import { Module } from '@nestjs/common';
import { DevToolService } from './dev-tool.service';
import { DevToolController } from './dev-tool.controller';

@Module({
  controllers: [DevToolController],
  providers: [DevToolService],
})
export class DevToolModule {}
