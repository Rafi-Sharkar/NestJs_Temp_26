import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CallType } from '@prisma';

export class CreateRtcCallDto {
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @IsEnum(CallType)
  @IsNotEmpty()
  type: CallType;

  @IsString()
  @IsOptional()
  offer?: string;
}
