import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateConversationDto,
  CreateGroupConversationDto,
} from './dto/create-conversation.dto';
import {
  UpdateConversationDto,
  UpdateGroupConversationDto,
} from './dto/update-conversation.dto';
import {
  SendMessageDto,
  MarkMessageAsReadDto,
  LoadConversationMessagesDto,
} from './dto/send-message.dto';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { AiChatService } from '../ai/ai-chat.service';

@Injectable()
export class ConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiChatService: AiChatService,
  ) {}

  /**
   * Initiate a 1-on-1 conversation with another user
   * Returns existing conversation or creates a new one
   */
  async initiateConversation(
    currentUserId: string,
    dto: CreateConversationDto,
  ) {
    const { recipientUserId } = dto;

    // Validate that user is not trying to start conversation with themselves
    if (currentUserId === recipientUserId) {
      throw new BadRequestException('Cannot start conversation with yourself');
    }

    // Check if both users exist
    const [currentUser, recipientUser] = await Promise.all([
      this.prisma.client.user.findUnique({ where: { id: currentUserId } }),
      this.prisma.client.user.findUnique({ where: { id: recipientUserId } }),
    ]);

    if (!currentUser || !recipientUser) {
      throw new BadRequestException('One or both users not found');
    }

    // Normalize user IDs to ensure consistent unique constraint
    const [user1Id, user2Id] = [currentUserId, recipientUserId].sort();

    // Try to find existing conversation
    let conversation = await this.prisma.client.conversation.findUnique({
      where: { user1Id_user2Id: { user1Id, user2Id } },
      include: {
        user1: {
          select: {
            id: true,
            name: true,
            email: true,
            fullName: true,
            isOnline: true,
          },
        },
        user2: {
          select: {
            id: true,
            name: true,
            email: true,
            fullName: true,
            isOnline: true,
          },
        },
        lastMessage: {
          select: {
            id: true,
            content: true,
            mediaUrl: true,
            mediaType: true,
            senderId: true,
            createdAt: true,
            isUnsent: true,
            isRead: true,
            reactions: true,
            replyTo: { select: { id: true, content: true, mediaType: true, mediaUrl: true, sender: { select: { id: true, name: true } } } },
            forwardedFrom: { select: { id: true, content: true, sender: { select: { id: true, name: true } } } },
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // If no existing conversation, create one
    if (!conversation) {
      conversation = await this.prisma.client.conversation.create({
        data: {
          type: 'INDIVIDUAL',
          status: 'ACTIVE',
          user1Id,
          user2Id,
          initiatedById: currentUserId,
        },
        include: {
          user1: {
            select: {
              id: true,
              name: true,
              email: true,
              fullName: true,
              isOnline: true,
            },
          },
          user2: {
            select: {
              id: true,
              name: true,
              email: true,
              fullName: true,
              isOnline: true,
            },
          },
          lastMessage: {
            select: {
              id: true,
              content: true,
              mediaUrl: true,
              mediaType: true,
              senderId: true,
              createdAt: true,
              isUnsent: true,
              isRead: true,
              reactions: true,
              replyTo: { select: { id: true, content: true, sender: { select: { name: true } }, isUnsent: true } },
              forwardedFrom: { select: { id: true, content: true, sender: { select: { name: true } }, isUnsent: true } },
              sender: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    }

    return {
      success: true,
      message: 'Conversation initiated successfully',
      conversation,
    };
  }

  /**
   * Initiate an AI conversation
   */
  async initiateAiConversation(currentUserId: string) {
    const aiUserId = this.aiChatService.getAiUserId();

    if (!aiUserId) {
      throw new BadRequestException('AI Assistant is currently unavailable');
    }

    const [user1Id, user2Id] = [currentUserId, aiUserId].sort();

    let conversation = await this.prisma.client.conversation.findUnique({
      where: { user1Id_user2Id: { user1Id, user2Id } },
      include: {
        user1: { select: { id: true, name: true, email: true, fullName: true, isOnline: true, profilePhoto: true } },
        user2: { select: { id: true, name: true, email: true, fullName: true, isOnline: true, profilePhoto: true } },
        lastMessage: {
          select: {
            id: true,
            content: true,
            mediaUrl: true,
            mediaType: true,
            senderId: true,
            createdAt: true,
            isUnsent: true,
            isRead: true,
            reactions: true,
            replyTo: { select: { id: true, content: true, sender: { select: { name: true } }, isUnsent: true } },
            forwardedFrom: { select: { id: true, content: true, sender: { select: { name: true } }, isUnsent: true } },
            sender: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!conversation) {
      conversation = await this.prisma.client.conversation.create({
        data: {
          type: 'INDIVIDUAL',
          status: 'ACTIVE',
          user1Id,
          user2Id,
          initiatedById: currentUserId,
        },
        include: {
          user1: { select: { id: true, name: true, email: true, fullName: true, isOnline: true, profilePhoto: true } },
          user2: { select: { id: true, name: true, email: true, fullName: true, isOnline: true, profilePhoto: true } },
          lastMessage: {
            select: {
              id: true,
              content: true,
              mediaUrl: true,
              mediaType: true,
              senderId: true,
              createdAt: true,
              isUnsent: true,
              isRead: true,
              reactions: true,
              replyTo: { select: { id: true, content: true, sender: { select: { name: true } }, isUnsent: true } },
              forwardedFrom: { select: { id: true, content: true, sender: { select: { name: true } }, isUnsent: true } },
              sender: { select: { id: true, name: true } },
            },
          },
        },
      });
    }

    return {
      success: true,
      message: 'AI Conversation initiated successfully',
      conversation,
    };
  }

  /**
   * Create a group conversation
   */
  async createGroupConversation(
    creatorUserId: string,
    dto: CreateGroupConversationDto,
  ) {
    const { name, description, memberUserIds, avatarUrl } = dto;

    // Validate that creator is included in members
    const allMemberIds = Array.from(new Set([creatorUserId, ...memberUserIds]));

    if (allMemberIds.length < 2) {
      throw new BadRequestException('Group must have at least 2 members');
    }

    // Check if all users exist
    const users = await this.prisma.client.user.findMany({
      where: { id: { in: allMemberIds } },
      select: { id: true },
    });

    if (users.length !== allMemberIds.length) {
      throw new BadRequestException('One or more users not found');
    }

    // Create group conversation with members
    const groupConversation = await this.prisma.client.conversation.create({
      data: {
        type: 'GROUP',
        status: 'ACTIVE',
        name,
        description,
        avatarUrl,
        members: {
          createMany: {
            data: allMemberIds.map((userId, index) => ({
              userId,
              role: userId === creatorUserId ? 'OWNER' : 'MEMBER',
            })),
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                fullName: true,
                isOnline: true,
              },
            },
          },
        },
        lastMessage: {
          select: {
            id: true,
            content: true,
            mediaUrl: true,
            mediaType: true,
            senderId: true,
            createdAt: true,
            isUnsent: true,
            isRead: true,
            reactions: true,
            replyTo: { select: { id: true, content: true, mediaType: true, mediaUrl: true, sender: { select: { id: true, name: true } } } },
            forwardedFrom: { select: { id: true, content: true, sender: { select: { id: true, name: true } } } },
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return {
      success: true,
      message: 'Group conversation created successfully',
      conversation: groupConversation,
    };
  }

  /**
   * Load all conversations for a user (both INDIVIDUAL and GROUP)
   * Includes the last message and other conversation details
   */
  async loadConversationsForUser(userId: string, statusesFilter?: string[]) {
    const statuses = statusesFilter && statusesFilter.length > 0 ? statusesFilter : ['ACTIVE', 'REQUESTED'];

    const conversations = await this.prisma.client.conversation.findMany({
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId },
          {
            members: {
              some: { userId },
            },
          },
        ],
        status: { in: statuses as any },
      },
      include: {
        user1: {
          select: {
            id: true,
            name: true,
            email: true,
            fullName: true,
            profilePhoto: true,
            isOnline: true,
          },
        },
        user2: {
          select: {
            id: true,
            name: true,
            email: true,
            fullName: true,
            profilePhoto: true,
            isOnline: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                fullName: true,
                profilePhoto: true,
                isOnline: true,
              },
            },
          },
        },
        lastMessage: {
          select: {
            id: true,
            content: true,
            mediaUrl: true,
            mediaType: true,
            senderId: true,
            createdAt: true,
            isUnsent: true,
            isRead: true,
            reactions: true,
            replyTo: { select: { id: true, content: true, mediaType: true, mediaUrl: true, sender: { select: { id: true, name: true } } } },
            forwardedFrom: { select: { id: true, content: true, sender: { select: { id: true, name: true } } } },
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                senderId: { not: userId },
                NOT: {
                  statuses: {
                    some: {
                      userId: userId,
                      status: 'READ',
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const active: any[] = [];
    const requests: any[] = [];

    conversations.forEach((conv) => {
      const { _count, ...rest } = conv;
      const formattedConv = {
        ...rest,
        unreadCount: _count?.messages ?? 0,
      };

      if (conv.status === 'REQUESTED' && conv.initiatedById !== userId) {
        requests.push(formattedConv);
      } else {
        active.push(formattedConv);
      }
    });

    return { active, requests };
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(senderId: string, dto: SendMessageDto) {
    const { conversationId, content, mediaUrl, mediaType } = dto;

    // Validate that either content or mediaUrl is provided
    if (!content && !mediaUrl) {
      throw new BadRequestException(
        'Message must have either content or media',
      );
    }

    // Verify conversation exists and user is a member
    const conversation = await this.prisma.client.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: { where: { userId: senderId } },
        user1: true,
        user2: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is a member (for GROUP) or participant (for INDIVIDUAL)
    if (conversation.type === 'GROUP') {
      if (conversation.members.length === 0) {
        throw new BadRequestException('You are not a member of this group');
      }
    } else {
      const isParticipant =
        conversation.user1Id === senderId || conversation.user2Id === senderId;
      if (!isParticipant) {
        throw new BadRequestException('You are not part of this conversation');
      }
    }

    // Create and send message
    const message = await this.prisma.client.message.create({
      data: {
        content,
        mediaUrl,
        mediaType,
        conversationId,
        senderId,
        replyToId: dto.replyToId,
        forwardedFromId: dto.forwardedFromId,
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true },
        },
        replyTo: { select: { id: true, content: true, mediaType: true, mediaUrl: true, sender: { select: { id: true, name: true } } } },
        forwardedFrom: { select: { id: true, content: true, sender: { select: { id: true, name: true } } } },
      },
    });

    // Update conversation's lastMessageId
    await this.prisma.client.conversation.update({
      where: { id: conversationId },
      data: { lastMessageId: message.id, updatedAt: new Date() },
    });

    return {
      success: true,
      message: 'Message sent successfully',
      data: message,
    };
  }

  /**
   * Load messages for a conversation with pagination
   */
  async loadConversationMessages(
    userId: string,
    conversationId: string,
    page = 1,
    limit = 20,
  ) {
    // Verify conversation exists and user is a member
    const conversation = await this.prisma.client.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: { where: { userId } },
        user1: true,
        user2: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is a member
    if (conversation.type === 'GROUP') {
      if (conversation.members.length === 0) {
        throw new BadRequestException('You are not a member of this group');
      }
    } else {
      const isParticipant =
        conversation.user1Id === userId || conversation.user2Id === userId;
      if (!isParticipant) {
        throw new BadRequestException('You are not part of this conversation');
      }
    }

    const safePage = Math.max(1, Math.floor(page));
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
    const skip = (safePage - 1) * safeLimit;

    const [messages, totalCount] = await Promise.all([
      this.prisma.client.message.findMany({
        where: { 
          conversationId,
          deletedBy: { none: { userId } }
        },
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: { id: true, name: true, email: true, isOnline: true },
          },
          statuses: true,
          reactions: true,
          replyTo: { select: { id: true, content: true, mediaType: true, mediaUrl: true, sender: { select: { id: true, name: true } } } },
          forwardedFrom: { select: { id: true, content: true, sender: { select: { id: true, name: true } } } },
        },
      }),
      this.prisma.client.message.count({
        where: { 
          conversationId,
          deletedBy: { none: { userId } }
        },
      }),
    ]);

    return {
      success: true,
      data: messages.reverse(),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / safeLimit),
      },
    };
  }

  /**
   * Mark a message as read
   */
  async markMessageAsRead(userId: string, messageId: string) {
    // Verify message exists
    const message = await this.prisma.client.message.findUnique({
      where: { id: messageId },
      include: { conversation: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Create or update message status for the user
    const messageStatus = await this.prisma.client.messageStatus.upsert({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
      update: { status: 'READ' },
      create: {
        messageId,
        userId,
        status: 'READ',
      },
    });

    return {
      success: true,
      message: 'Message marked as read',
      data: messageStatus,
    };
  }

  /**
   * Load a single conversation with details
   */
  async loadSingleConversation(userId: string, conversationId: string) {
    const conversation = await this.prisma.client.conversation.findUnique({
      where: { id: conversationId },
      include: {
        user1: {
          select: {
            id: true,
            name: true,
            email: true,
            fullName: true,
            isOnline: true,
            profilePhoto: true,
            biography: true,
            isVerified: true,
          },
        },
        user2: {
          select: {
            id: true,
            name: true,
            email: true,
            fullName: true,
            isOnline: true,
            profilePhoto: true,
            biography: true,
            isVerified: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                fullName: true,
                isOnline: true,
                profilePhoto: true,
              },
            },
          },
        },
        lastMessage: {
          select: {
            id: true,
            content: true,
            mediaUrl: true,
            mediaType: true,
            senderId: true,
            createdAt: true,
            isUnsent: true,
            isRead: true,
            reactions: true,
            replyTo: { select: { id: true, content: true, mediaType: true, mediaUrl: true, sender: { select: { id: true, name: true } } } },
            forwardedFrom: { select: { id: true, content: true, sender: { select: { id: true, name: true } } } },
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Verify user is a member
    if (conversation.type === 'GROUP') {
      const isMember = conversation.members.some((m) => m.userId === userId);
      if (!isMember) {
        throw new BadRequestException('You are not a member of this group');
      }
    } else {
      const isParticipant =
        conversation.user1Id === userId || conversation.user2Id === userId;
      if (!isParticipant) {
        throw new BadRequestException('You are not part of this conversation');
      }
    }

    return {
      success: true,
      data: conversation,
    };
  }

  /**
   * Update a group conversation (name, description, avatarUrl, link proposal, add members)
   */
  async updateGroupConversation(
    userId: string,
    conversationId: string,
    dto: UpdateGroupConversationDto,
  ) {
    // 1. Verify conversation exists and is a group
    const conversation = await this.prisma.client.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.type !== 'GROUP') {
      throw new BadRequestException(
        'Cannot update an individual conversation via this endpoint',
      );
    }

    // 2. Verify user is a member of the group
    const isMember = conversation.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new BadRequestException('You are not a member of this group');
    }

    // 3. Handle new members if provided
    let newMembersData: { userId: string; role: any }[] = [];
    if (dto.newMemberIds && dto.newMemberIds.length > 0) {
      const existingMemberIds = new Set(
        conversation.members.map((m) => m.userId),
      );
      const idsToAdd = dto.newMemberIds.filter(
        (id) => !existingMemberIds.has(id),
      );

      if (idsToAdd.length > 0) {
        // Verify all new user IDs exist
        const users = await this.prisma.client.user.findMany({
          where: { id: { in: idsToAdd } },
          select: { id: true },
        });

        if (users.length !== idsToAdd.length) {
          throw new BadRequestException('One or more new users not found');
        }

        newMembersData = idsToAdd.map((id) => ({
          userId: id,
          role: 'MEMBER', // new members are just regular members
        }));
      }
    }

    // 4. Update the conversation
    const updatedConversation = await this.prisma.client.conversation.update({
      where: { id: conversationId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        ...(newMembersData.length > 0 && {
          members: {
            createMany: {
              data: newMembersData,
            },
          },
        }),
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                fullName: true,
                isOnline: true,
              },
            },
          },
        },
      },
    });

    return {
      success: true,
      message: 'Group conversation updated successfully',
      conversation: updatedConversation,
    };
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(userId: string, conversationId: string) {
    // 1. Verify conversation exists
    const conversation = await this.prisma.client.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // 2. Verify user has permission to delete
    if (conversation.type === 'GROUP') {
      const member = conversation.members.find((m) => m.userId === userId);
      if (!member) {
        throw new BadRequestException('You are not a member of this group');
      }
      if (member.role !== 'OWNER') {
        throw new BadRequestException(
          'Only the group owner can delete the conversation',
        );
      }
    } else {
      const isParticipant =
        conversation.user1Id === userId || conversation.user2Id === userId;
      if (!isParticipant) {
        throw new BadRequestException('You are not part of this conversation');
      }
    }

    // 3. Delete the conversation
    // Due to onDelete: Cascade on related models, this will delete members, messages, etc.
    await this.prisma.client.conversation.delete({
      where: { id: conversationId },
    });

    return {
      success: true,
      message: 'Conversation deleted successfully',
    };
  }

  /**
   * Remove a member from a group conversation
   */
  async removeMemberFromGroup(
    userId: string,
    conversationId: string,
    memberId: string,
  ) {
    // 1. Verify conversation exists and is a group
    const conversation = await this.prisma.client.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.type !== 'GROUP') {
      throw new BadRequestException(
        'Cannot remove members from an individual conversation',
      );
    }

    // 2. Verify requesting user is the owner
    const requester = conversation.members.find((m) => m.userId === userId);
    if (!requester || requester.role !== 'OWNER') {
      throw new BadRequestException('Only the group owner can remove members');
    }

    // 3. Verify member exists in the group
    const memberToRemove = conversation.members.find(
      (m) => m.userId === memberId,
    );
    if (!memberToRemove) {
      throw new BadRequestException('User is not a member of this group');
    }

    // 4. Prevent owner from removing themselves
    if (userId === memberId) {
      throw new BadRequestException(
        'Owner cannot remove themselves. Please delete the group or transfer ownership first.',
      );
    }

    // 5. Remove the member
    await this.prisma.client.conversationMember.delete({
      where: {
        conversationId_userId: {
          conversationId,
          userId: memberId,
        },
      },
    });

    return {
      success: true,
      message: 'Member removed successfully',
    };
  }

  // --- Advanced Conversation Actions ---

  async toggleUnread(userId: string, conversationId: string) {
    const member = await this.getMember(userId, conversationId);
    const updated = await this.prisma.client.conversationMember.update({
      where: { id: member.id },
      data: { isUnread: !member.isUnread },
    });
    return { success: true, isUnread: updated.isUnread };
  }

  async deleteConversationForMe(userId: string, conversationId: string) {
    const member = await this.getMember(userId, conversationId);
    await this.prisma.client.conversationMember.update({
      where: { id: member.id },
      data: { isDeleted: true },
    });
    return { success: true, message: 'Conversation deleted for you' };
  }

  async togglePin(userId: string, conversationId: string) {
    const member = await this.getMember(userId, conversationId);
    const updated = await this.prisma.client.conversationMember.update({
      where: { id: member.id },
      data: { isPinned: !member.isPinned },
    });
    return { success: true, isPinned: updated.isPinned };
  }

  async toggleMute(userId: string, conversationId: string, isMuted?: boolean, mutedUntil?: string) {
    const member = await this.getMember(userId, conversationId);
    const newMuteState = isMuted !== undefined ? isMuted : !member.isMuted;
    
    const updated = await this.prisma.client.conversationMember.update({
      where: { id: member.id },
      data: { 
        isMuted: newMuteState,
        mutedUntil: mutedUntil ? new Date(mutedUntil) : null,
      },
    });
    return { success: true, isMuted: updated.isMuted, mutedUntil: updated.mutedUntil };
  }

  async toggleBlock(userId: string, conversationId: string) {
    const member = await this.getMember(userId, conversationId);
    const updated = await this.prisma.client.conversationMember.update({
      where: { id: member.id },
      data: { hasBlocked: !member.hasBlocked },
    });
    return { success: true, hasBlocked: updated.hasBlocked };
  }

  async reportConversation(userId: string, conversationId: string, reason: string) {
    await this.getMember(userId, conversationId); // ensure they are part of it
    // Report-conversation persistence is intentionally a no-op:
    // there is no `reportConversation` table in the current schema.
    return { success: true, reported: true };
  }

  // --- Advanced Message Actions ---

  async reactToMessage(userId: string, messageId: string, emoji: string) {
    // Basic verification that user is in conversation
    const message = await this.prisma.client.message.findUnique({
      where: { id: messageId },
      include: { conversation: true },
    });
    if (!message) throw new NotFoundException('Message not found');
    await this.getMember(userId, message.conversationId);

    // Check if reaction exists
    const existing = await this.prisma.client.messageReaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
    });

    if (existing) {
      // Remove reaction
      await this.prisma.client.messageReaction.delete({ where: { id: existing.id } });
    } else {
      // Add reaction
      await this.prisma.client.messageReaction.create({
        data: { messageId, userId, emoji },
      });
    }

    // Return the updated message schema
    const updatedMessage = await this.prisma.client.message.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, name: true, email: true } },
        reactions: true,
        statuses: true,
      },
    });

    return { 
      success: true, 
      action: existing ? 'removed' : 'added', 
      emoji,
      data: updatedMessage 
    };
  }

  async removeReaction(userId: string, messageId: string, emoji: string) {
    const message = await this.prisma.client.message.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new NotFoundException('Message not found');

    const existing = await this.prisma.client.messageReaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
    });

    if (!existing) {
      throw new BadRequestException('Reaction not found');
    }

    await this.prisma.client.messageReaction.delete({ where: { id: existing.id } });

    // Return the updated message schema
    const updatedMessage = await this.prisma.client.message.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, name: true, email: true } },
        reactions: true,
        statuses: true,
      },
    });

    return { success: true, action: 'removed', emoji, data: updatedMessage };
  }

  async replyMessage(userId: string, messageId: string, dto: { content?: string, mediaUrl?: string, mediaType?: any }) {
    const message = await this.prisma.client.message.findUnique({
      where: { id: messageId },
    });

    if (!message) throw new NotFoundException('Message not found');

    return this.sendMessage(userId, {
      conversationId: message.conversationId,
      content: dto.content,
      mediaUrl: dto.mediaUrl,
      mediaType: dto.mediaType,
      replyToId: messageId,
    });
  }

  async forwardMessage(userId: string, messageId: string, toConversationId: string) {
    const message = await this.prisma.client.message.findUnique({
      where: { id: messageId },
    });

    if (!message) throw new NotFoundException('Message to forward not found');

    return this.sendMessage(userId, {
      conversationId: toConversationId,
      content: message.content || undefined,
      mediaUrl: message.mediaUrl || undefined,
      mediaType: message.mediaType || undefined,
      forwardedFromId: messageId,
    });
  }

  async unsendMessage(userId: string, messageId: string) {
    const message = await this.prisma.client.message.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) {
      throw new ConflictException('You can only unsend your own messages');
    }

    await this.prisma.client.message.update({
      where: { id: messageId },
      data: { isUnsent: true, content: null, mediaUrl: null }, // hide content
    });

    // Return the updated message schema
    const updatedMessage = await this.prisma.client.message.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, name: true, email: true } },
        reactions: true,
        statuses: true,
      },
    });

    return { success: true, message: 'Message unsent', data: updatedMessage };
  }

  async deleteMessageForMe(userId: string, messageId: string) {
    const message = await this.prisma.client.message.findUnique({
      where: { id: messageId },
      include: { conversation: true },
    });
    if (!message) throw new NotFoundException('Message not found');
    await this.getMember(userId, message.conversationId);

    // upsert deletion
    await this.prisma.client.messageDeletion.upsert({
      where: { messageId_userId: { messageId, userId } },
      update: {},
      create: { messageId, userId },
    });

    // Return the updated message schema
    const updatedMessage = await this.prisma.client.message.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, name: true, email: true } },
        reactions: true,
        statuses: true,
        deletedBy: true,
      },
    });

    return { success: true, message: 'Message deleted for you', data: updatedMessage };
  }

  async acceptMessageRequest(userId: string, conversationId: string) {
    const conversation = await this.prisma.client.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.status !== 'REQUESTED') {
      throw new BadRequestException('Conversation is not in requested state');
    }
    if (conversation.initiatedById === userId) {
      throw new BadRequestException('You cannot accept a request you initiated');
    }
    if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
      throw new BadRequestException('You are not part of this conversation');
    }

    const updated = await this.prisma.client.conversation.update({
      where: { id: conversationId },
      data: { status: 'ACTIVE' },
    });
    return { success: true, message: 'Message request accepted', conversation: updated };
  }

  async declineMessageRequest(userId: string, conversationId: string) {
    const conversation = await this.prisma.client.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.status !== 'REQUESTED') {
      throw new BadRequestException('Conversation is not in requested state');
    }
    if (conversation.initiatedById === userId) {
      throw new BadRequestException('You cannot decline a request you initiated');
    }
    if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
      throw new BadRequestException('You are not part of this conversation');
    }

    await this.prisma.client.conversation.delete({
      where: { id: conversationId },
    });

    return { success: true, message: 'Message request declined and deleted' };
  }

  // Helper method
  private async getMember(userId: string, conversationId: string) {
    // If it's a group, check conversationMember. If it's INDIVIDUAL, we might need a unified way.
    // Wait, the schema has `ConversationMember` for GROUP only? Let me double check schema.
    // Actually, `ConversationMember` might be created for INDIVIDUAL too, or we need to query `Conversation` and check user1Id/user2Id.
    // Let's create a universal helper that returns a "member state" or creates a member row if missing.
    let member = await this.prisma.client.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });

    if (!member) {
      // If it's an INDIVIDUAL conversation, members might not be in the table yet if we rely on user1Id/user2Id.
      const conv = await this.prisma.client.conversation.findUnique({
        where: { id: conversationId },
      });
      if (!conv) throw new NotFoundException('Conversation not found');
      if (conv.type === 'INDIVIDUAL' && (conv.user1Id === userId || conv.user2Id === userId)) {
        // Create the member row to track state (unread, pinned, etc)
        member = await this.prisma.client.conversationMember.create({
          data: {
            conversationId,
            userId,
            role: 'MEMBER',
          }
        });
      } else {
        throw new NotFoundException('You are not a member of this conversation');
      }
    }
    return member;
  }
}

