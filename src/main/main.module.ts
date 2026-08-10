import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ConversationModule } from './conversation/conversation.module';
import { RtcCallModule } from './rtc-call/rtc-call.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { UploadModule } from './upload-s3/upload.module';
import { VpsFileUploadModule } from './vps-fileupload/vps-fileupload.module';
import { DevToolModule } from './dev-tool/dev-tool.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    AuthModule,
    ConversationModule,
    RtcCallModule,
    SubscriptionModule,
    UploadModule,
    VpsFileUploadModule,
    DevToolModule,
    AiModule,
  ],
})
export class MainModule {}
