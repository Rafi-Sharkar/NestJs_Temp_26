import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from '../notifications.service';
import { SocialNotificationEvent } from '../events/social.events';

@Injectable()
export class SocialNotificationListener {
  private readonly logger = new Logger(SocialNotificationListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  async notifyUserTagged(userId: string, taggerId: string, postId: string) {
    const notificationData = {
      type: SocialNotificationEvent.SOCIAL_TAGGED,
      recipientId: userId,
      title: 'You were tagged in a post',
      message: 'Someone tagged you in a new post.',
      meta: { taggerId, postId },
      senderId: taggerId,
    };

    try {
      await this.notificationsService.addNotification(notificationData);
    } catch (error: any) {
      this.logger.error(`Error sending tagged notification: ${error.message}`);
    }
  }

  async notifyUserStoryTagged(userId: string, taggerId: string, storyId: string) {
    const notificationData = {
      type: SocialNotificationEvent.SOCIAL_STORY_TAGGED,
      recipientId: userId,
      title: 'You were tagged in a story',
      message: 'Someone tagged you in a new story.',
      meta: { taggerId, storyId },
      senderId: taggerId,
    };

    try {
      await this.notificationsService.addNotification(notificationData);
    } catch (error: any) {
      this.logger.error(`Error sending story tagged notification: ${error.message}`);
    }
  }

  async notifyUserCommented(
    userId: string,
    commenterId: string,
    postId: string,
    commentPreview: string,
  ) {
    const notificationData = {
      type: SocialNotificationEvent.SOCIAL_COMMENTED,
      recipientId: userId,
      title: 'New comment on your post',
      message:
        commentPreview.length > 50
          ? commentPreview.substring(0, 50) + '...'
          : commentPreview,
      meta: { commenterId, postId },
      senderId: commenterId,
    };

    try {
      await this.notificationsService.addNotification(notificationData);
    } catch (error: any) {
      this.logger.error(`Error sending comment notification: ${error.message}`);
    }
  }
}
