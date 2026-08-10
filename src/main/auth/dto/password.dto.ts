import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ChangePasswordDto {
  @ApiPropertyOptional({
    description: 'Current password. Optional for Google Sign-In',
    example: 'strongPassword123',
  })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ example: 'NewstrongPassword123' })
  @IsString()
  newPassword: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example' })
  @IsString()
  email: string;
}

export class VerifyPasswordOtpDto {
  @ApiProperty({ example: '123456', description: '6-digit OTP sent to email' })
  @IsString()
  otp: string;

  @ApiProperty({ example: 'user@example' })
  @IsString()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    example: 'reset_token_xyz123',
    description: 'Token received from password/verify-otp',
  })
  @IsString()
  token: string;

  @ApiProperty({ example: 'user@example' })
  @IsString()
  email: string;

  @ApiProperty({ example: 'newStrongPassword123' })
  @IsString()
  newPassword: string;
}
