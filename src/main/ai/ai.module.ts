import { Module } from '@nestjs/common';
import { OpenAiProvider } from './openai.provider';
import { AiChatService } from './ai-chat.service';

@Module({
  providers: [OpenAiProvider, AiChatService],
  exports: [AiChatService],
})
export class AiModule {}
