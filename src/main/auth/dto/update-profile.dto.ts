import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { GenderType } from '@prisma';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John', description: 'Optional username' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Optional full name',
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({
    example: 'I am a software developer',
    description: 'Optional biography',
  })
  @IsOptional()
  @IsString()
  biography?: string;

  @ApiPropertyOptional({
    enum: GenderType,
    example: 'MALE',
    description: 'Optional gender (MALE, FEMALE, OTHER)',
  })
  @IsOptional()
  @IsEnum(GenderType)
  gender?: GenderType;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Optional profile photo file',
  })
  @IsOptional()
  profilePhoto?: any;
}
