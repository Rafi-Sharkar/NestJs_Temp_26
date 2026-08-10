import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateDeviceInfoDto {
  @ApiPropertyOptional({
    example: 'iPhone 13 Pro',
    description: 'The name or model of the device',
  })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({
    example: 'iOS',
    description: 'The platform (e.g., iOS, Android, Web)',
  })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({
    example: '1.0.0',
    description: 'The version of the application',
  })
  @IsOptional()
  @IsString()
  appVersion?: string;

  @ApiPropertyOptional({
    example: 'fcm-token-string',
    description: 'Firebase Cloud Messaging token for push notifications',
  })
  @IsOptional()
  @IsString()
  fcmToken?: string;

  @ApiPropertyOptional({
    example: 'mobile',
    description: 'Type of device (e.g. mobile, tablet, desktop)',
  })
  @IsOptional()
  @IsString()
  deviceType?: string;
}
