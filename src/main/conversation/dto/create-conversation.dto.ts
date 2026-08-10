import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsArray,
  ArrayMinSize,
} from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({
    description: 'ID of the recipient user to start a conversation with',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  recipientUserId: string;
}

export class CreateGroupConversationDto {
  @ApiProperty({
    description: 'Name of the group conversation',
    example: 'Project Discussion',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the group conversation',
    example: 'A group for discussing project goals',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Array of member user IDs',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  memberUserIds: string[];

  @ApiPropertyOptional({
    description: 'URL for the group avatar',
    example: 'https://example.com/avatar.png',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
