import { ApiProperty } from '@nestjs/swagger';

export class GoogleAuthResponseDto {
  @ApiProperty({
    description: 'Firebase unique identifier',
    example: 'abc123xyz',
  })
  firebase_uid: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@gmail.com',
  })
  email: string;

  @ApiProperty({
    description: 'Full name of the user',
    example: 'User Name',
  })
  fullName: string;

  @ApiProperty({
    description: 'User profile photo URL',
    example: 'https://photo-url',
    nullable: true,
  })
  photoUrl: string | null;

  @ApiProperty({
    description: 'OAuth provider name',
    example: 'google',
  })
  provider: string;

  @ApiProperty({
    description: 'Firebase Cloud Messaging token',
    example: 'device_fcm_token',
    nullable: true,
  })
  fcmToken: string | null;

  @ApiProperty({
    description: 'JWT access token for authenticated requests',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;
}
