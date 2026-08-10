import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenAiProvider {
  private readonly client: OpenAI;
  private readonly logger = new Logger(OpenAiProvider.name);
  readonly model: string;
  readonly maxTokens: number;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY is not set. AI Chat will fail until configured.');
    }

    this.client = new OpenAI({
      apiKey: apiKey || 'dummy-key-to-prevent-crash',
      timeout: 30_000,
      maxRetries: 2,
    });
    this.model = this.config.get<string>('OPENAI_MODEL') || 'gpt-4o-mini';
    this.maxTokens = parseInt(this.config.get<string>('OPENAI_MAX_TOKENS') ?? '1000', 10);
  }

  getClient() {
    return this.client;
  }
}
