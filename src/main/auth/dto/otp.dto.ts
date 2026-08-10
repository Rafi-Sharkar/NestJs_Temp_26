import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OtpType } from '@prisma';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
} from 'class-validator';

export class ResendOtpDto {
  @ApiProperty({
    example: 'john@gmail.com',
    description: 'User email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({
    example: OtpType.EMAIL_VERIFICATION,
    description: 'OTP type',
    enum: OtpType,
  })
  @IsNotEmpty()
  @IsEnum(OtpType)
  type: OtpType = OtpType.EMAIL_VERIFICATION;
}

export class VerifyOTPDto {
  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code',
  })
  @IsNotEmpty()
  otp: string;

  @ApiPropertyOptional({
    example: 'john@gmail.com',
    description: 'Email address',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    example: OtpType.TWO_FACTOR_AUTH,
    description: 'OTP type',
    enum: OtpType,
  })
  @IsOptional()
  @IsEnum(OtpType)
  type?: OtpType;
}

// ─────────────────────────────────────────────
// Verify Phone OTP
// ─────────────────────────────────────────────
export class VerifyPhoneOtpDto {
  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code',
  })
  @IsNotEmpty()
  otp: string;

  @ApiProperty({
    example: '+8801234567890',
    description: 'Phone number (international format)',
  })
  @IsNotEmpty()
  @IsPhoneNumber()
  phoneNumber: string;
}

// ─────────────────────────────────────────────
// Resend Phone OTP
// ─────────────────────────────────────────────
export class ResetPhoneOtpDto {
  @ApiProperty({
    example: '+8801234567890',
    description: 'User phone number (international format)',
  })
  @IsOptional()
  phoneNumber: string;

  @ApiPropertyOptional({
    example: OtpType.PHONE_VERIFICATION,
    description: 'OTP type',
    enum: OtpType,
  })
  @IsNotEmpty()
  @IsEnum(OtpType)
  type: OtpType = OtpType.PHONE_VERIFICATION;
}
