import {
  Controller,
  Post,
  Body,
  UseGuards,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger';
import { ConversationService } from './conversation.service';
import {
  CreateConversationDto,
  CreateGroupConversationDto,
} from './dto/create-conversation.dto';
import { UpdateGroupConversationDto } from './dto/update-conversation.dto';
import {
  ReactMessageDto,
  ReportConversationDto,
  MuteConversationDto,
  ReplyMessageDto,
  ForwardMessageDto,
} from './dto/advanced-messaging.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { User } from '../../common/decorators/user.decorator';

@ApiTags('Conversation')
@ApiBearerAuth()
@Controller('conversation')
@UseGuards(JwtAuthGuard)
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  /**
   * Initialize/Create an individual conversation with another user
   * POST /conversation/init
   */
  @Post('init')
  @ApiOperation({
    summary: 'Initialize or get an individual conversation with another user',
  })
  @ApiBody({ type: CreateConversationDto })
  async initiateConversation(
    @User('sub') userId: string,
    @Body() dto: CreateConversationDto,
  ) {
    return this.conversationService.initiateConversation(userId, dto);
  }

  /**
   * Initialize an AI conversation
   * POST /conversation/ai/init
   */
  @Post('ai/init')
  @ApiOperation({
    summary: 'Initialize or get the AI assistant conversation',
  })
  async initiateAiConversation(@User('sub') userId: string) {
    return this.conversationService.initiateAiConversation(userId);
  }

  /**
   * Create a group conversation
   * POST /conversation/group
   */
  @Post('group')
  @ApiOperation({ summary: 'Create a new group conversation' })
  @ApiBody({ type: CreateGroupConversationDto })
  async createGroupConversation(
    @User('sub') userId: string,
    @Body() dto: CreateGroupConversationDto,
  ) {
    return this.conversationService.createGroupConversation(userId, dto);
  }
  /**
   * Update a group conversation (name, description, avatarUrl, link proposal, add members)
   * PATCH /conversation/group/:id
   */
  @Patch('group/:id')
  @ApiOperation({ summary: 'Update a group conversation' })
  @ApiBody({ type: UpdateGroupConversationDto })
  async updateGroupConversation(
    @User('sub') userId: string,
    @Param('id') conversationId: string,
    @Body() dto: UpdateGroupConversationDto,
  ) {
    return this.conversationService.updateGroupConversation(
      userId,
      conversationId,
      dto,
    );
  }

  /**
   * Delete a conversation
   * DELETE /conversation/:id
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a conversation' })
  async deleteConversation(
    @User('sub') userId: string,
    @Param('id') conversationId: string,
  ) {
    return this.conversationService.deleteConversation(userId, conversationId);
  }

  /**
   * Remove a member from a group conversation
   * DELETE /conversation/group/:id/member/:memberId
   */
  @Delete('group/:id/member/:memberId')
  @ApiOperation({ summary: 'Remove a member from a group conversation' })
  async removeMemberFromGroup(
    @User('sub') userId: string,
    @Param('id') conversationId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.conversationService.removeMemberFromGroup(
      userId,
      conversationId,
      memberId,
    );
  }

  // --- Advanced Conversation Actions ---

  @Patch(':id/accept-request')
  @ApiOperation({ summary: 'Accept a message request' })
  async acceptMessageRequest(@User('sub') userId: string, @Param('id') conversationId: string) {
    return this.conversationService.acceptMessageRequest(userId, conversationId);
  }

  @Patch(':id/decline-request')
  @ApiOperation({ summary: 'Decline a message request' })
  async declineMessageRequest(@User('sub') userId: string, @Param('id') conversationId: string) {
    return this.conversationService.declineMessageRequest(userId, conversationId);
  }

  @Patch(':id/unread')
  @ApiOperation({ summary: 'Toggle unread status of a conversation' })
  async toggleUnread(@User('sub') userId: string, @Param('id') conversationId: string) {
    return this.conversationService.toggleUnread(userId, conversationId);
  }

  @Delete(':id/delete-for-me')
  @ApiOperation({ summary: 'Delete conversation for the current user' })
  async deleteConversationForMe(@User('sub') userId: string, @Param('id') conversationId: string) {
    return this.conversationService.deleteConversationForMe(userId, conversationId);
  }

  @Patch(':id/pin')
  @ApiOperation({ summary: 'Toggle pinned status of a conversation' })
  async togglePin(@User('sub') userId: string, @Param('id') conversationId: string) {
    return this.conversationService.togglePin(userId, conversationId);
  }

  @Patch(':id/mute')
  @ApiOperation({ summary: 'Toggle mute status of a conversation' })
  @ApiBody({ type: MuteConversationDto })
  async toggleMute(
    @User('sub') userId: string,
    @Param('id') conversationId: string,
    @Body() dto: MuteConversationDto,
  ) {
    return this.conversationService.toggleMute(userId, conversationId, dto.isMuted, dto.mutedUntil);
  }

  @Patch(':id/block')
  @ApiOperation({ summary: 'Toggle blocked status of a conversation' })
  async toggleBlock(@User('sub') userId: string, @Param('id') conversationId: string) {
    return this.conversationService.toggleBlock(userId, conversationId);
  }

  @Post(':id/report')
  @ApiOperation({ summary: 'Report a conversation' })
  @ApiBody({ type: ReportConversationDto })
  async reportConversation(
    @User('sub') userId: string,
    @Param('id') conversationId: string,
    @Body() dto: ReportConversationDto,
  ) {
    return this.conversationService.reportConversation(userId, conversationId, dto.reason);
  }

  // --- Advanced Message Actions ---

  @Post('message/:messageId/react')
  @ApiOperation({ summary: 'React to a message' })
  @ApiBody({ type: ReactMessageDto })
  async reactToMessage(
    @User('sub') userId: string,
    @Param('messageId') messageId: string,
    @Body() dto: ReactMessageDto,
  ) {
    return this.conversationService.reactToMessage(userId, messageId, dto.emoji);
  }

  @Delete('message/:messageId/react')
  @ApiOperation({ summary: 'Remove a reaction from a message' })
  @ApiBody({ type: ReactMessageDto })
  async removeReaction(
    @User('sub') userId: string,
    @Param('messageId') messageId: string,
    @Body() dto: ReactMessageDto,
  ) {
    return this.conversationService.removeReaction(userId, messageId, dto.emoji);
  }

  @Post('message/:messageId/reply')
  @ApiOperation({ summary: 'Reply to a message' })
  @ApiBody({ type: ReplyMessageDto })
  async replyMessage(
    @User('sub') userId: string,
    @Param('messageId') messageId: string,
    @Body() dto: ReplyMessageDto,
  ) {
    return this.conversationService.replyMessage(userId, messageId, dto);
  }

  @Post('message/:messageId/forward')
  @ApiOperation({ summary: 'Forward a message' })
  @ApiBody({ type: ForwardMessageDto })
  async forwardMessage(
    @User('sub') userId: string,
    @Param('messageId') messageId: string,
    @Body() dto: ForwardMessageDto,
  ) {
    return this.conversationService.forwardMessage(userId, messageId, dto.toConversationId);
  }

  @Post('message/:messageId/unsend')
  @ApiOperation({ summary: 'Unsend a message' })
  async unsendMessage(@User('sub') userId: string, @Param('messageId') messageId: string) {
    return this.conversationService.unsendMessage(userId, messageId);
  }

  @Delete('message/:messageId/delete-for-me')
  @ApiOperation({ summary: 'Delete a message for the current user' })
  async deleteMessageForMe(@User('sub') userId: string, @Param('messageId') messageId: string) {
    return this.conversationService.deleteMessageForMe(userId, messageId);
  }
}
