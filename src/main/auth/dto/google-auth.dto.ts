import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GoogleAuthDto {
  @ApiProperty({
    description: 'Firebase ID token from client',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ...',
  })
  @IsString()
  idToken: string;

  @ApiPropertyOptional({
    description: 'Optional referral token or code from inviter',
    example: 'johndoe',
  })
  @IsOptional()
  @IsString()
  referToken?: string;
}
