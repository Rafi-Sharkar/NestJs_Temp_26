import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IceServerItemDto {
  @ApiProperty({ example: 'stun:stun.l.google.com:19302' })
  urls: string;

  @ApiPropertyOptional({ example: '1719525564:webrtc-user' })
  username?: string;

  @ApiPropertyOptional({ example: 'abc123xyz==' })
  credential?: string;
}

export class IceServersResponseDto {
  @ApiProperty({ type: [IceServerItemDto] })
  iceServers: IceServerItemDto[];
}
