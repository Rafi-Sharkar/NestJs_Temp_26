import { ApiProperty } from '@nestjs/swagger';

export class GoogleAuthResponseDto {
  @ApiProperty({
    description: 'Firebase unique identifier',
    example: 'user123abc',
  })
  firebase_uid: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@gmail.com',
  })
  email: string;

  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
  })
  fullName: string;

  @ApiProperty({
    description: 'User profile photo URL',
    example: 'https://example.com/photo.jpg',
    nullable: true,
  })
  profilePhoto: string | null;

  @ApiProperty({
    description: 'OAuth provider name',
    example: 'google',
  })
  provider: string;

  @ApiProperty({
    description: 'Firebase ID token for verification',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ...',
  })
  idToken: string;

  @ApiProperty({
    description: 'Firebase Cloud Messaging token',
    example: 'fcm_token_optional',
    nullable: true,
  })
  fcmToken: string | null;

  @ApiProperty({
    description: 'JWT access token for authenticated requests',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;
}
