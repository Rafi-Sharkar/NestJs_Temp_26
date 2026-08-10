import * as crypto from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { CreateRtcCallDto, AcceptRtcCallDto } from './dto/rtc-call.dto';
import { CallStatus, CallType } from '@prisma';

@Injectable()
export class RtcCallService {
  private readonly logger = new Logger(RtcCallService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  getIceServers() {
    const secret = this.config.get<string>('TURN_SECRET');
    const ttl = parseInt(this.config.get<string>('TURN_TTL') || '86400', 10);
    const turnUrl = this.config.get<string>('TURN_SERVER_URL');

    const iceServers: any[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];

    if (turnUrl && secret) {
      const timestamp = Math.floor(Date.now() / 1000) + ttl;
      const username = `${timestamp}:webrtc-user`;
      const credential = crypto
        .createHmac('sha1', secret)
        .update(username)
        .digest('base64');

      iceServers.push({
        urls: turnUrl,
        username,
        credential,
      });
    } else {
      this.logger.warn(
        'TURN_SERVER_URL or TURN_SECRET is not configured in environment variables.',
      );
    }

    return { iceServers };
  }

  async initiateCall(userId: string, dto: CreateRtcCallDto) {
    const { conversationId, type, offer } = dto;

    this.logger.log(
      `User ${userId} initiating a ${type} call in conversation ${conversationId}`,
    );

    // Check if the conversation exists and if the user is a member
    const conversation = await this.prisma.client.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: true,
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Validate membership
    let isMember = false;
    let otherMemberIds: string[] = [];

    if (conversation.type === 'INDIVIDUAL') {
      if (conversation.user1Id === userId) {
        isMember = true;
        if (conversation.user2Id) otherMemberIds.push(conversation.user2Id);
      } else if (conversation.user2Id === userId) {
        isMember = true;
        if (conversation.user1Id) otherMemberIds.push(conversation.user1Id);
      }
    } else {
      isMember = conversation.members.some((m) => m.userId === userId);
      otherMemberIds = conversation.members
        .map((m) => m.userId)
        .filter((id) => id !== userId);
    }

    if (!isMember) {
      throw new Error('You are not a member of this conversation');
    }

    // Check if there is an active call in this conversation
    const activeCall = await this.prisma.client.call.findFirst({
      where: {
        conversationId,
        status: {
          in: ['INITIATED', 'RINGING', 'ACTIVE'] as CallStatus[],
        },
      },
    });

    if (activeCall) {
      throw new Error('A call is already active in this conversation');
    }

    // Create Call record
    const call = await this.prisma.client.call.create({
      data: {
        conversationId,
        initiatorId: userId,
        type,
        status: 'INITIATED',
        offer,
      },
      include: {
        initiator: {
          select: {
            id: true,
            name: true,
            fullName: true,
            profilePhoto: true,
          },
        },
      },
    });

    // Create participant record for the initiator
    await this.prisma.client.callParticipant.create({
      data: {
        callId: call.id,
        userId,
        joinedAt: new Date(),
      },
    });

    return {
      call,
      otherMemberIds,
    };
  }

  async ringCall(userId: string, callId: string) {
    const call = await this.prisma.client.call.findUnique({
      where: { id: callId },
    });

    if (!call) {
      throw new Error('Call not found');
    }

    if (call.status === 'INITIATED') {
      this.logger.log(
        `Call ${callId} status changed to RINGING by user ${userId}`,
      );
      return this.prisma.client.call.update({
        where: { id: callId },
        data: { status: 'RINGING' },
      });
    }

    return call;
  }

  async acceptCall(userId: string, dto: AcceptRtcCallDto) {
    const { callId, answer } = dto;

    this.logger.log(`Call ${callId} accepted by user ${userId}`);

    const call = await this.prisma.client.call.findUnique({
      where: { id: callId },
    });

    if (!call) {
      throw new Error('Call not found');
    }

    // Update Call to ACTIVE
    const updatedCall = await this.prisma.client.call.update({
      where: { id: callId },
      data: {
        status: 'ACTIVE',
        answer,
        startedAt: call.startedAt || new Date(),
      },
    });

    // Upsert CallParticipant for accepting user
    await this.prisma.client.callParticipant.upsert({
      where: {
        callId_userId: {
          callId,
          userId,
        },
      },
      update: {
        joinedAt: new Date(),
      },
      create: {
        callId,
        userId,
        joinedAt: new Date(),
      },
    });

    return updatedCall;
  }

  async declineCall(userId: string, callId: string) {
    this.logger.log(`Call ${callId} declined by user ${userId}`);

    const call = await this.prisma.client.call.findUnique({
      where: { id: callId },
    });

    if (!call) {
      throw new Error('Call not found');
    }

    const now = new Date();
    // Callee declined the call
    const updatedCall = await this.prisma.client.call.update({
      where: { id: callId },
      data: {
        status: 'DECLINED',
        endedAt: now,
      },
    });

    // Save/update participant left time
    await this.prisma.client.callParticipant.upsert({
      where: {
        callId_userId: {
          callId,
          userId,
        },
      },
      update: {
        leftAt: now,
        duration: 0,
      },
      create: {
        callId,
        userId,
        leftAt: now,
        duration: 0,
      },
    });

    return updatedCall;
  }

  async endCall(userId: string, callId: string) {
    this.logger.log(`Call ${callId} ended by user ${userId}`);

    const call = await this.prisma.client.call.findUnique({
      where: { id: callId },
    });

    if (!call) {
      throw new Error('Call not found');
    }

    if (
      call.status === 'ENDED' ||
      call.status === 'DECLINED' ||
      call.status === 'MISSED' ||
      call.status === 'FAILED'
    ) {
      return call;
    }

    const now = new Date();
    const startedAt = call.startedAt || call.createdAt;
    const duration = Math.round((now.getTime() - startedAt.getTime()) / 1000);

    // End call
    const updatedCall = await this.prisma.client.call.update({
      where: { id: callId },
      data: {
        status: 'ENDED',
        endedAt: now,
        duration: duration > 0 ? duration : 0,
      },
    });

    // Update participants who haven't left
    const activeParticipants =
      await this.prisma.client.callParticipant.findMany({
        where: {
          callId,
          leftAt: null,
        },
      });

    for (const participant of activeParticipants) {
      const joinedAt = participant.joinedAt || call.createdAt;
      const partDuration = Math.round(
        (now.getTime() - joinedAt.getTime()) / 1000,
      );

      await this.prisma.client.callParticipant.update({
        where: { id: participant.id },
        data: {
          leftAt: now,
          duration: partDuration > 0 ? partDuration : 0,
        },
      });
    }

    return updatedCall;
  }

  async addIceCandidate(userId: string, callId: string, candidate: string) {
    const participant = await this.prisma.client.callParticipant.findUnique({
      where: {
        callId_userId: {
          callId,
          userId,
        },
      },
    });

    let candidatesList: any[] = [];
    if (participant && participant.iceCandidates) {
      try {
        candidatesList = JSON.parse(participant.iceCandidates);
        if (!Array.isArray(candidatesList)) {
          candidatesList = [];
        }
      } catch (e) {
        candidatesList = [];
      }
    }

    try {
      candidatesList.push(JSON.parse(candidate));
    } catch (e) {
      candidatesList.push(candidate);
    }

    return this.prisma.client.callParticipant.upsert({
      where: {
        callId_userId: {
          callId,
          userId,
        },
      },
      update: {
        iceCandidates: JSON.stringify(candidatesList),
      },
      create: {
        callId,
        userId,
        iceCandidates: JSON.stringify(candidatesList),
      },
    });
  }

  async getCallHistory(userId: string) {
    return this.prisma.client.call.findMany({
      where: {
        OR: [
          { initiatorId: userId },
          {
            participants: {
              some: { userId },
            },
          },
        ],
      },
      include: {
        initiator: {
          select: {
            id: true,
            name: true,
            fullName: true,
            profilePhoto: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                fullName: true,
                profilePhoto: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getCallHistoryByConversation(userId: string, conversationId: string) {
    // Verify membership in conversation first
    const conversation = await this.prisma.client.conversation.findUnique({
      where: { id: conversationId },
      include: { members: true },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    let isMember = false;
    if (conversation.type === 'INDIVIDUAL') {
      isMember =
        conversation.user1Id === userId || conversation.user2Id === userId;
    } else {
      isMember = conversation.members.some((m) => m.userId === userId);
    }

    if (!isMember) {
      throw new Error('Unauthorized');
    }

    return this.prisma.client.call.findMany({
      where: {
        conversationId,
      },
      include: {
        initiator: {
          select: {
            id: true,
            name: true,
            fullName: true,
            profilePhoto: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                fullName: true,
                profilePhoto: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getCallDetails(userId: string, callId: string) {
    const call = await this.prisma.client.call.findUnique({
      where: { id: callId },
      include: {
        initiator: {
          select: {
            id: true,
            name: true,
            fullName: true,
            profilePhoto: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                fullName: true,
                profilePhoto: true,
              },
            },
          },
        },
        conversation: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!call) {
      throw new Error('Call not found');
    }

    // Verify user membership in the conversation of this call
    let isMember = false;
    if (call.conversation.type === 'INDIVIDUAL') {
      isMember =
        call.conversation.user1Id === userId ||
        call.conversation.user2Id === userId;
    } else {
      isMember = call.conversation.members.some((m) => m.userId === userId);
    }

    if (!isMember) {
      throw new Error('Unauthorized');
    }

    return call;
  }
}
