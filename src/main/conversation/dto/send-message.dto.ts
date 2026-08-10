import { IsUUID, IsString, IsOptional, IsUrl, IsEnum } from 'class-validator';
import { $Enums } from '@prisma';

export class SendMessageDto {
  @IsUUID()
  conversationId: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsUrl()
  mediaUrl?: string;

  @IsOptional()
  @IsEnum($Enums.MessageMediaType)
  mediaType?: $Enums.MessageMediaType;

  @IsOptional()
  @IsUUID()
  replyToId?: string;

  @IsOptional()
  @IsUUID()
  forwardedFromId?: string;
}

export class MarkMessageAsReadDto {
  @IsUUID()
  messageId: string;
}

export class LoadConversationMessagesDto {
  @IsUUID()
  conversationId: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
