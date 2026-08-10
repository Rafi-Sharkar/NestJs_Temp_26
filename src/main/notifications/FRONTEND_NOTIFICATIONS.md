# Frontend Integration Guide: Notifications WebSocket

This document provides a simple, direct guide for app and frontend developers to integrate the Notifications WebSocket.

**Namespace**: `/notifications` (Connect via this path)  
**Authentication**: Valid JWT Bearer token required in the connection handshake.

---

## 1. Connection Example

Pass the token via the `auth` object (common in Socket.IO).

```javascript
import { io } from 'socket.io-client';

const socket = io('http://your-api-url/notifications', {
  auth: {
    token: 'Bearer YOUR_JWT_TOKEN',
  },
});

socket.on('connect', () => {
  console.log('Connected to notifications!', socket.id);
});

socket.on('connected', (data) => {
  console.log('Connection acknowledged:', data);
  // { userId: '...', message: 'Connected to notifications' }
});

socket.on('connect_error', (err) => {
  console.error('Connection failed:', err.message);
});
```

---

## 2. Events Overview

Here is the quick reference for the events you can receive (Listen) on this namespace.

| Client Emit Event | Server Response / Listener | Payload (Type) | Description |
|-------------------|----------------------------|----------------|-------------|
| *(on connect)* | `connected` | `{ userId: UUID, message: string }` | Server acknowledges successful connection and authentication. |
| *(listen)* | `new_tag_request` | `{ message: string, postTagId: UUID, postId: UUID, actionUrl: string }` | Triggered when someone tags you in a post and your settings require manual approval. |
| *(listen)* | `new_collaboration_request` | `{ message: string, collaborationId: UUID, postId: UUID, actionUrl: string }` | Triggered when someone invites you to collaborate on a post. |
| *(listen)* | `collaboration.invite` | `{ type: string, title: string, message: string, meta: { collaborationId } }` | Triggered when a brand invites you to a campaign collaboration. |
| *(listen)* | `social.tagged` | `{ type: string, title: string, message: string, meta: { taggerId, postId } }` | Triggered when you are tagged in a post. |
| *(listen)* | `social.commented` | `{ type: string, title: string, message: string, meta: { commenterId, postId } }` | Triggered when someone comments on your post. |
| *(listen)* | `social.followed` | `{ type: string, title: string, message: string, meta: { followerId } }` | Triggered when someone follows you. |
| *(listen)* | `social.tag_accepted` | `{ type: string, title: string, message: string, meta: { postId, tagId } }` | Triggered when a user accepts your post tag request. |
| *(listen)* | `social.collab_accepted` | `{ type: string, title: string, message: string, meta: { postId, collabId } }` | Triggered when a user accepts your collaboration request. |
| *(listen)* | `proposal.reminder` | `{ type: string, title: string, message: string, meta: { proposalTitle, proposalId, startDate } }` | Triggered as a reminder for an upcoming plan you are participating in. |
| *(listen)* | `proposal.cancelled` | `{ type: string, title: string, message: string, meta: { proposalTitle, proposalId } }` | Triggered when a plan you are participating in is cancelled. |
| *(listen)* | `seed.spent` | `{ type: string, title: string, message: string, meta: { amount } }` | Triggered when you spend seeds. |
| *(listen)* | `seed.empty` | `{ type: string, title: string, message: string, meta: {} }` | Triggered when you run out of usable seeds. |
| *(listen)* | `seed.earned` | `{ type: string, title: string, message: string, meta: { amount, senderId? } }` | Triggered when you earn seeds. |
| *(listen)* | `chat_message` | `{ type: string, title: string, message: string, meta: { conversationId, senderId } }` | Triggered when you receive a chat message. |
| *(listen)* | `call_invite` | *(Data-only payload)* | Triggered to wake up CallKit when someone calls you. |
| *(listen)* | `call_cancelled` | *(Data-only payload)* | Triggered to stop the ringtone if the caller hangs up before you answer. |
| *(listen)* | `notification` | `{ type: string, title: string, message: string, meta: object }` | General fallback for other systemic notifications (like payments, etc) if configured. |

---

## 3. Payload Details & Explanations

### Post Tag Requests

**New Tag Request Received**  
*Listen*: `new_tag_request`

Triggered when another user tags you in their post, and your `tagApprove` settings are set to `MANUALLY_APPROVE` (or you fall outside their auto-approve rules).

```json
{
  "message": "You were tagged in a post by Alice.",
  "postTagId": "uuid-of-the-post-tag",
  "postId": "uuid-of-the-post",
  "postCreatorId": "uuid-of-alice",
  "postCreatorName": "Alice",
  "postCreatorprofileUrl": "https://example.com/alice.jpg",
  "actionUrl": "/post/tags/uuid-of-the-post-tag/status"
}
```

**How to handle this event:**
When you receive this event, you can show an in-app toast or banner. If the user clicks "Accept" or "Reject", make a standard `PATCH` request to the provided `actionUrl`:

```javascript
// Example using fetch to accept the tag
fetch('http://your-api-url' + data.actionUrl, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: JSON.stringify({ status: 'ACCEPTED' }) // or 'REJECTED'
});
```

### Post Collaboration Requests

**New Collaboration Request Received**  
*Listen*: `new_collaboration_request`

Triggered when another user invites you to collaborate on their post, and your `tagApprove` settings have `isCollaborationPost` set to `true`.

```json
{
  "message": "You were invited to collaborate on a post by Alice.",
  "collaborationId": "uuid-of-the-collaboration",
  "postId": "uuid-of-the-post",
  "postCreatorId": "uuid-of-alice",
  "postCreatorName": "Alice",
  "postCreatorprofileUrl": "https://example.com/alice.jpg",
  "actionUrl": "/post/collaborations/uuid-of-the-collaboration/accept"
}
```

**How to handle this event:**
When you receive this event, you can show an in-app toast or banner. If the user clicks "Accept" or "Reject", make a standard `PATCH` request to the provided `actionUrl` with a `status` query parameter (`ACCEPTED` or `REJECTED`):

```javascript
// Example using fetch to accept/reject the collaboration request
const status = 'ACCEPTED'; // or 'REJECTED'
fetch('http://your-api-url' + data.actionUrl + `?status=${status}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});
```

### General Push Notifications

These events follow a standard `{ type, title, message, meta }` structure and can be used to show local push notifications or in-app alerts.

**Social Notifications**
*Listen*: `social.tagged` / `social.commented` / `social.followed` / `social.tag_accepted` / `social.collab_accepted`

```json
{
  "type": "social.commented",
  "title": "New comment on your post",
  "message": "This is a great post! ...",
  "meta": { "commenterId": "uuid", "postId": "uuid" },
  "senderId": "uuid-of-commenter"
}
```

```json
{
  "type": "social.followed",
  "title": "New Follower",
  "message": "Alice started following you!",
  "meta": { "followerId": "uuid" },
  "senderId": "uuid-of-follower"
}
```

```json
{
  "type": "social.tag_accepted",
  "title": "Tag Accepted",
  "message": "Alice accepted your tag request.",
  "meta": { "postId": "uuid", "tagId": "uuid" },
  "senderId": "uuid-of-alice"
}
```

```json
{
  "type": "social.collab_accepted",
  "title": "Collaboration Accepted",
  "message": "Alice accepted your collaboration request.",
  "meta": { "postId": "uuid", "collabId": "uuid" },
  "senderId": "uuid-of-alice"
}
```

**Campaign Collaboration Notifications**
*Listen*: `collaboration.invite`

```json
{
  "type": "collaboration.invite",
  "title": "New Collaboration Invite",
  "message": "You have been invited to collaborate on Product Launch Campaign",
  "meta": { "collaborationId": "uuid" },
  "senderId": "uuid-of-brand"
}
```

**Plan / Activity Notifications**
*Listen*: `proposal.reminder` / `proposal.cancelled`

```json
{
  "type": "proposal.reminder",
  "title": "Upcoming Proposal Reminder",
  "message": "The proposal \"Beach Cleanup\" is starting soon...",
  "meta": { "proposalTitle": "Beach Cleanup", "proposalId": "uuid", "startDate": "2026-07-05T10:00:00.000Z" }
}
```

**Seed Balance Notifications**
*Listen*: `seed.spent` / `seed.empty` / `seed.earned`

```json
{
  "type": "seed.earned",
  "title": "Seeds Earned",
  "message": "You have earned 50 seeds.",
  "meta": { "amount": 50, "senderId": "uuid" },
  "senderId": "uuid"
}
```

**Chat Message Notifications**
*Listen*: `chat_message`

```json
{
  "type": "chat_message",
  "title": "Rakib Hasan",
  "message": "Sent a message",
  "meta": { "conversationId": "chat_room_123", "senderId": "uuid" },
  "senderId": "uuid"
}
```

### WebRTC Call Notifications (Data-Only)

These are special **Data-Only** FCM messages sent without a `notification` block. They are intended to wake up CallKit (iOS) or ConnectionService (Android) while the app is in the background/terminated.

**Call Invite Received**  
*Listen*: `call_invite`

```json
{
  "message": {
    "token": "USER_DEVICE_TOKEN",
    "android": {
      "priority": "high"
    },
    "apns": {
      "headers": {
        "apns-priority": "10"
      },
      "payload": {
        "aps": {
          "content-available": 1
        }
      }
    },
    "data": {
      "type": "call_invite",
      "callId": "65ab321c...",
      "callerName": "Rakib Hasan",
      "hasVideo": "true",
      "initiatorId": "65ab123c...",
      "conversationId": "chat_room_123"
    }
  }
}
```

**Call Cancelled / Hung Up**  
*Listen*: `call_cancelled`

```json
{
  "message": {
    "token": "USER_DEVICE_TOKEN",
    "data": {
      "type": "call_cancelled",
      "callId": "65ab321c..."
    }
  }
}
```
