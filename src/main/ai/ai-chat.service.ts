import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OpenAiProvider } from './openai.provider';
import { PrismaService } from '@/lib/prisma/prisma.service';

const SYSTEM_PROMPT = `You are a helpful assistant for this application.
Be concise, friendly, and helpful.`;

@Injectable()
export class AiChatService implements OnModuleInit {
  private readonly logger = new Logger(AiChatService.name);
  private aiUserId: string;

  constructor(
    private openai: OpenAiProvider,
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    const aiUser = await this.ensureAiUserExists();
    this.aiUserId = aiUser.id;
  }

  async ensureAiUserExists() {
    const email = 'ai@system.local';
    let aiUser = await this.prisma.client.user.findUnique({
      where: { email },
      include: { profilePhoto: true },
    });

    // You can replace this URL with your desired fixed photo URL in .env
    const fixedPhotoUrl =
      process.env.AI_BOT_AVATAR_URL || 'https://api.dicebear.com/7.x/bottts/png?seed=AIAssistant&backgroundColor=19c37d';

    if (!aiUser) {
      aiUser = await this.prisma.client.user.create({
        data: {
          email,
          name: 'ai_assistant',
          fullName: 'AI Assistant',
          password: 'AI_BOT_NO_PASSWORD_LOGIN',
          isVerified: true,
          role: 'ADMIN',
          profilePhoto: {
            create: {
              filename: 'ai-avatar.png',
              originalFilename: 'ai-avatar.png',
              path: 'ai-avatar',
              url: fixedPhotoUrl,
              mimeType: 'image/png',
              size: 0,
              fileType: 'image',
            },
          },
        },
        include: { profilePhoto: true },
      });
      this.logger.log(`Created AI System User with ID: ${aiUser.id}`);
    } else if (!aiUser.profilePhoto) {
      // Add the photo if the AI user already exists but doesn't have one
      aiUser = await this.prisma.client.user.update({
        where: { id: aiUser.id },
        data: {
          profilePhoto: {
            create: {
              filename: 'ai-avatar.png',
              originalFilename: 'ai-avatar.png',
              path: 'ai-avatar',
              url: fixedPhotoUrl,
              mimeType: 'image/png',
              size: 0,
              fileType: 'image',
            },
          },
        },
        include: { profilePhoto: true },
      });
      this.logger.log(`Added fixed photo to AI System User`);
    } else if (aiUser.profilePhoto.url !== fixedPhotoUrl) {
      // Ensure the photo stays fixed to the specified URL
      await this.prisma.client.fileInstance.update({
        where: { id: aiUser.profilePhoto.id },
        data: { url: fixedPhotoUrl },
      });
    }
    
    return aiUser;
  }

  getAiUserId() {
    return this.aiUserId;
  }

  async *streamReply(conversationId: string): AsyncGenerator<string, void, unknown> {
    // 1. Fetch recent messages
    const history = await this.prisma.client.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const ordered = history.reverse();

    // 2. Format for OpenAI
    const apiMessages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...ordered.map(m => ({
        role: m.senderId === this.aiUserId ? 'assistant' as const : 'user' as const,
        content: m.content || '',
      }))
    ];

    try {
      const stream = await this.openai.getClient().chat.completions.create({
        model: this.openai.model,
        max_tokens: this.openai.maxTokens,
        messages: apiMessages,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? '';
        if (delta) {
          yield delta;
        }
      }
    } catch (error: any) {
      this.logger.error('Failed to stream AI reply: ' + error.message);
      yield 'Sorry, I encountered an error while thinking. Please try again.';
    }
  }
}
