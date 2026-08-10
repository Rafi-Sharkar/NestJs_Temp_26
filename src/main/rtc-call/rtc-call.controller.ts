import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RtcCallService } from './rtc-call.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { User } from '../../common/decorators/user.decorator';
import { IceServersResponseDto } from './dto/ice-servers-response.dto';

@ApiTags('RTC Call')
@ApiBearerAuth()
@Controller('rtc-call')
@UseGuards(JwtAuthGuard)
export class RtcCallController {
  constructor(private readonly rtcCallService: RtcCallService) {}

  /**
   * Get STUN/TURN ICE servers configuration
   * GET /rtc-call/ice-servers
   */
  @Get('ice-servers')
  @ApiOperation({ summary: 'Get STUN/TURN ICE servers configuration' })
  @ApiResponse({
    status: 200,
    description: 'STUN/TURN ICE servers configuration',
    type: IceServersResponseDto,
  })
  async getIceServers() {
    return this.rtcCallService.getIceServers();
  }

  /**
   * Get call history for the authenticated user
   * GET /rtc-call/history
   */
  @Get('history')
  @ApiOperation({ summary: 'Get call history for the authenticated user' })
  async getCallHistory(@User('sub') userId: string) {
    return this.rtcCallService.getCallHistory(userId);
  }

  /**
   * Get call history for a specific conversation
   * GET /rtc-call/conversation/:conversationId
   */
  @Get('conversation/:conversationId')
  @ApiOperation({ summary: 'Get call history for a specific conversation' })
  async getCallHistoryByConversation(
    @User('sub') userId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.rtcCallService.getCallHistoryByConversation(
      userId,
      conversationId,
    );
  }

  /**
   * Get detailed call info by ID
   * GET /rtc-call/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get detailed call info by call ID' })
  async getCallDetails(
    @User('sub') userId: string,
    @Param('id') callId: string,
  ) {
    return this.rtcCallService.getCallDetails(userId, callId);
  }
}
