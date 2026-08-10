import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateConversationDto } from './create-conversation.dto';
import { IsOptional, IsString, IsArray, IsUUID } from 'class-validator';
// IsUUID is retained for the newMemberIds validator below.

export class UpdateConversationDto extends PartialType(CreateConversationDto) {}

export class UpdateGroupConversationDto {
  @ApiPropertyOptional({ description: 'Name of the group conversation' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Description of the group conversation' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Array of new member user IDs to add' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  newMemberIds?: string[];

  @ApiPropertyOptional({ description: 'URL for the group avatar' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
