import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { WEBSOCKET_CORS_CONFIG } from '@/common/constants/cors.constant';
import { SocketAuthMiddleware } from '@/common/jwt/socket-auth.middleware';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { RtcCallService } from './rtc-call.service';
import { FcmService } from '../notifications/fcm.service';
import { CallEvents } from './dto/rtc-call.enum';
import {
  CreateRtcCallDto,
  AcceptRtcCallDto,
  WebRtcOfferDto,
  WebRtcAnswerDto,
  WebRtcIceCandidateDto,
  ToggleControlDto,
} from './dto/rtc-call.dto';

@WebSocketGateway({
  cors: WEBSOCKET_CORS_CONFIG,
  namespace: '/rtc-call',
})
export class RtcCallGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RtcCallGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly prisma: PrismaService,
    private readonly rtcCallService: RtcCallService,
    private readonly socketAuthMiddleware: SocketAuthMiddleware,
    private readonly fcmService: FcmService,
  ) {}

  afterInit(server: Server) {
    server.use(this.socketAuthMiddleware.use());
    this.logger.log('RTC Call gateway initialized with JWT middleware.');
  }

  async handleConnection(client: Socket) {
    const userId = client.data.userId;
    const user = client.data.user;

    if (!userId || !user) {
      this.logger.warn(
        `RTC Connection rejected - Invalid user data: ${client.id}`,
      );
      client.disconnect();
      return;
    }

    try {
      // Join user-specific room
      await client.join(`user:${userId}`);

      const fullUser = await this.prisma.client.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          fullName: true,
          role: true,
          userType: true,
          isOnline: true,
          isVerified: true,
          biography: true,
          gender: true,
          isCreator: true,
          isBrand: true,
        },
      });

      const now = new Date();

      // update user online status
      await this.prisma.client.user.update({
        where: { id: userId },
        data: {
          isOnline: true,
          lastActiveAt: now,
        },
      });

      // Emit user info back to client
      client.emit(CallEvents.Call_User_Info, {
        success: true,
        message: 'Successfully connected',
        user: fullUser,
      });

      // Broadcast status change
      this.server.emit(CallEvents.USER_STATUS_CHANGED, {
        userId,
        isOnline: true,
        lastActiveAt: now,
      });

      this.logger.log(
        `User connected to RTC - ID: ${userId}, Email: ${user.email}, Socket: ${client.id}`,
      );
    } catch (error: any) {
      this.logger.error(`Error in RTC handleConnection: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (!userId) {
      return;
    }

    try {
      const now = new Date();

      // Update user offline status
      await this.prisma.client.user.update({
        where: { id: userId },
        data: { isOnline: false, lastActiveAt: now },
      });

      // Broadcast status change
      this.server.emit(CallEvents.USER_STATUS_CHANGED, {
        userId,
        isOnline: false,
        lastActiveAt: now,
      });

      // Log user disconnection
      this.logger.log(
        `User disconnected - ID: ${userId}, Socket: ${client.id}`,
      );
    } catch (error: any) {
      this.logger.error(`Error in handleDisconnect: ${error.message}`);
    }
  }

  @SubscribeMessage(CallEvents.INITIATE)
  async handleInitiateCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: CreateRtcCallDto,
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
      const result = await this.rtcCallService.initiateCall(userId, payload);

      // Emit INCOMING to every other conversation member (callee side)
      for (const memberId of result.otherMemberIds) {
        this.server.to(`user:${memberId}`).emit(CallEvents.INCOMING, {
          callId: result.call.id,
          conversationId: result.call.conversationId,
          initiatorId: result.call.initiatorId,
          type: result.call.type,
          offer: result.call.offer,
          initiator: result.call.initiator,
        });

        // Send Data-Only FCM notification to wake up CallKit on Flutter
        this.fcmService
          .sendDataOnlyToUser(memberId, {
            type: 'call_invite',
            callId: result.call.id,
            callerName:
              result.call.initiator.fullName ||
              result.call.initiator.name ||
              'Someone',
            hasVideo: result.call.type === 'VIDEO' ? 'true' : 'false',
            initiatorId: result.call.initiatorId,
            conversationId: result.call.conversationId,
          })
          .catch((err) =>
            this.logger.error(
              `Failed to send call_invite FCM to ${memberId}:`,
              err,
            ),
          );
      }

      // Confirm outgoing call back to the caller (NOT ACCEPTED — the call is not answered yet)
      client.emit(CallEvents.OUTGOING, {
        success: true,
        call: result.call,
        ringingTo: result.otherMemberIds,
      });
    } catch (error: any) {
      this.logger.error(`Error initiating call: ${error.message}`);
      client.emit(CallEvents.FAILED, {
        message: error.message || 'Failed to initiate call',
      });
    }
  }

  @SubscribeMessage(CallEvents.RINGING)
  async handleRinging(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { callId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
      const call = await this.rtcCallService.ringCall(userId, payload.callId);

      // Emit RINGING back to the initiator
      this.server.to(`user:${call.initiatorId}`).emit(CallEvents.RINGING, {
        callId: call.id,
        calleeId: userId,
      });
    } catch (error: any) {
      this.logger.error(`Error in call ringing: ${error.message}`);
    }
  }

  @SubscribeMessage(CallEvents.ACCEPT)
  async handleAccept(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AcceptRtcCallDto,
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
      const call = await this.rtcCallService.acceptCall(userId, payload);

      // Emit ACCEPTED to caller/initiator
      this.server.to(`user:${call.initiatorId}`).emit(CallEvents.ACCEPTED, {
        callId: call.id,
        answer: call.answer,
        calleeId: userId,
      });

      // Send the caller's accumulated ICE candidates to the callee
      // because they likely missed them while offline/ringing.
      const callerParticipant =
        await this.prisma.client.callParticipant.findUnique({
          where: {
            callId_userId: {
              callId: call.id,
              userId: call.initiatorId,
            },
          },
        });

      if (callerParticipant && callerParticipant.iceCandidates) {
        let candidates: any[] = [];
        try {
          candidates = JSON.parse(callerParticipant.iceCandidates);
        } catch (e) {
          // ignore parsing error
        }

        if (Array.isArray(candidates)) {
          for (const cand of candidates) {
            client.emit(CallEvents.ICE_CANDIDATE, {
              callId: call.id,
              candidate: typeof cand === 'string' ? cand : JSON.stringify(cand),
              senderId: call.initiatorId,
            });
          }
        }
      }
    } catch (error: any) {
      this.logger.error(`Error accepting call: ${error.message}`);
      client.emit(CallEvents.FAILED, {
        message: error.message || 'Failed to accept call',
      });
    }
  }

  @SubscribeMessage(CallEvents.DECLINE)
  async handleDecline(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { callId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
      const call = await this.rtcCallService.declineCall(
        userId,
        payload.callId,
      );

      // Emit DECLINED to caller/initiator
      this.server.to(`user:${call.initiatorId}`).emit(CallEvents.DECLINED, {
        callId: call.id,
        calleeId: userId,
      });
    } catch (error: any) {
      this.logger.error(`Error declining call: ${error.message}`);
    }
  }

  @SubscribeMessage(CallEvents.END)
  async handleEnd(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { callId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
      const call = await this.rtcCallService.endCall(userId, payload.callId);

      // Notify all members of the call's conversation
      const fullCall = await this.prisma.client.call.findUnique({
        where: { id: call.id },
        include: {
          conversation: {
            include: {
              members: true,
            },
          },
        },
      });

      if (fullCall) {
        let memberIds: string[] = [];
        if (fullCall.conversation.type === 'INDIVIDUAL') {
          memberIds = [
            fullCall.conversation.user1Id,
            fullCall.conversation.user2Id,
          ].filter(Boolean) as string[];
        } else {
          memberIds = fullCall.conversation.members.map((m) => m.userId);
        }

        for (const memberId of memberIds) {
          this.server.to(`user:${memberId}`).emit(CallEvents.ENDED, {
            callId: call.id,
            endedBy: userId,
            duration: call.duration,
          });

          if (memberId !== userId) {
            // Send Data-Only FCM notification to stop ringing on Flutter
            this.fcmService
              .sendDataOnlyToUser(memberId, {
                type: 'call_cancelled',
                callId: call.id,
              })
              .catch((err) =>
                this.logger.error(
                  `Failed to send call_cancelled FCM to ${memberId}:`,
                  err,
                ),
              );
          }
        }
      }
    } catch (error: any) {
      this.logger.error(`Error ending call: ${error.message}`);
    }
  }

  @SubscribeMessage(CallEvents.OFFER)
  async handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: WebRtcOfferDto,
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    this.server.to(`user:${payload.targetUserId}`).emit(CallEvents.OFFER, {
      callId: payload.callId,
      offer: payload.offer,
      senderId: userId,
    });
  }

  @SubscribeMessage(CallEvents.ANSWER)
  async handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: WebRtcAnswerDto,
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    this.server.to(`user:${payload.targetUserId}`).emit(CallEvents.ANSWER, {
      callId: payload.callId,
      answer: payload.answer,
      senderId: userId,
    });
  }

  @SubscribeMessage(CallEvents.ICE_CANDIDATE)
  async handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: WebRtcIceCandidateDto,
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
      // Save ICE candidate in database
      await this.rtcCallService.addIceCandidate(
        userId,
        payload.callId,
        payload.candidate,
      );
    } catch (error: any) {
      this.logger.error(`Error saving ICE candidate: ${error.message}`);
    }

    // Relay to target client
    this.server
      .to(`user:${payload.targetUserId}`)
      .emit(CallEvents.ICE_CANDIDATE, {
        callId: payload.callId,
        candidate: payload.candidate,
        senderId: userId,
      });
  }

  @SubscribeMessage(CallEvents.TOGGLE_AUDIO)
  async handleToggleAudio(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ToggleControlDto,
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    await this.broadcastToCallMembers(
      payload.callId,
      userId,
      CallEvents.PARTICIPANT_AUDIO_TOGGLED,
      {
        callId: payload.callId,
        userId,
        enabled: payload.enabled,
      },
    );
  }

  @SubscribeMessage(CallEvents.TOGGLE_VIDEO)
  async handleToggleVideo(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ToggleControlDto,
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    await this.broadcastToCallMembers(
      payload.callId,
      userId,
      CallEvents.PARTICIPANT_VIDEO_TOGGLED,
      {
        callId: payload.callId,
        userId,
        enabled: payload.enabled,
      },
    );
  }

  @SubscribeMessage(CallEvents.TOGGLE_SCREENSHARE)
  async handleToggleScreenshare(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ToggleControlDto,
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    await this.broadcastToCallMembers(
      payload.callId,
      userId,
      CallEvents.PARTICIPANT_SCREENSHARE_TOGGLED,
      {
        callId: payload.callId,
        userId,
        enabled: payload.enabled,
      },
    );
  }

  private async broadcastToCallMembers(
    callId: string,
    senderId: string,
    event: string,
    payload: any,
  ) {
    try {
      const call = await this.prisma.client.call.findUnique({
        where: { id: callId },
        include: {
          conversation: {
            include: {
              members: true,
            },
          },
        },
      });
      if (!call) return;

      let memberIds: string[] = [];
      if (call.conversation.type === 'INDIVIDUAL') {
        memberIds = [
          call.conversation.user1Id,
          call.conversation.user2Id,
        ].filter(Boolean) as string[];
      } else {
        memberIds = call.conversation.members.map((m) => m.userId);
      }

      const targetIds = memberIds.filter((id) => id !== senderId);
      for (const targetId of targetIds) {
        this.server.to(`user:${targetId}`).emit(event, payload);
      }
    } catch (error: any) {
      this.logger.error(`Error broadcasting event ${event}: ${error.message}`);
    }
  }
}
