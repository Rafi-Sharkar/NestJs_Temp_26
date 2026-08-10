import { IsUUID, IsString, IsNotEmpty, IsOptional, IsBoolean, IsUrl, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { $Enums } from '@prisma';

export class ReactMessageDto {
  @ApiProperty({ description: 'The emoji to react with', example: '👍' })
  @IsNotEmpty()
  @IsString()
  emoji: string;
}

export class ReportConversationDto {
  @ApiProperty({ description: 'The reason for reporting the conversation', example: 'Spam' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class MuteConversationDto {
  @ApiPropertyOptional({ description: 'Whether to mute the conversation', example: true })
  @IsOptional()
  @IsBoolean()
  isMuted?: boolean;

  @ApiPropertyOptional({ description: 'Date until which the conversation is muted', example: '2025-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsString()
  mutedUntil?: string;
}

export class ReplyMessageDto {
  @ApiPropertyOptional({ description: 'Text content of the reply' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Media URL of the reply' })
  @IsOptional()
  @IsUrl()
  mediaUrl?: string;

  @ApiPropertyOptional({ description: 'Media type of the reply', enum: $Enums.MessageMediaType })
  @IsOptional()
  @IsEnum($Enums.MessageMediaType)
  mediaType?: $Enums.MessageMediaType;
}

export class ForwardMessageDto {
  @ApiProperty({ description: 'Conversation ID to forward the message to' })
  @IsNotEmpty()
  @IsUUID()
  toConversationId: string;
}
