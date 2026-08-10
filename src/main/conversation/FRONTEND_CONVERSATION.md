# Frontend Integration Guide: Conversation WebSocket

This document provides a simple, direct guide for app and frontend developers to integrate the Conversation Messaging WebSocket.

**Namespace**: `/conversation` (Connect via this path)  
**Authentication**: Valid JWT Bearer token required in the connection handshake.

---

## 1. Connection Example

Pass the token via the `auth` object (common in Socket.IO).

```javascript
import { io } from 'socket.io-client';

const socket = io('http://your-api-url/conversation', {
  auth: {
    token: 'Bearer YOUR_JWT_TOKEN',
  },
});

socket.on('connect', () => {
  console.log('Connected to conversation!', socket.id);
});

socket.on('conversation:user_info', (data) => {
  console.log('User info received on connect:', data.user);
});

socket.on('connect_error', (err) => {
  console.error('Connection failed:', err.message);
});
```

---

## 2. Events Overview

Here is the quick reference for all events you can send (Emit) and receive (Listen).

| Client Emit Event                        | Server Response / Listener                                                          | Input Payload (Type)                                                               | Description                                                     |
| :--------------------------------------- | :---------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------- | :-------------------------------------------------------------- |
| _(on connect)_                           | `conversation:user_info`                                                            | _None_                                                                             | Server sends the user's full information upon connection.       |
| `conversation:load_conversations`        | `conversation:conversation_list`                                                    | `{ status?: string | string[] }` (Optional)                                        | Load all conversations (individual/groups). Can filter by status. |
| `conversation:load_single_conversation`  | `conversation:load_single_conversation`                                             | `{ conversationId: UUID }`                                                         | Load details for a single specific conversation.                |
| `conversation:conversation_messages`     | `conversation:conversation_messages`                                                | `{ conversationId: UUID, page?: number, limit?: number }`                          | Load paginated messages for a conversation.                     |
| `conversation:message_send`              | `conversation:message_sent` (to sender)<br>`conversation:message_receive` (to rcvr) | `{ conversationId: UUID, content?: string, mediaUrl?: URL, mediaType?: Enum, replyToId?: UUID, forwardedFromId?: UUID }` | Send a new message, reply, or forward a message.                |
| `conversation:message_react`             | `conversation:message_reacted` (to participants)                                    | `{ messageId: UUID, emoji: string }`                                               | React to a message or remove a reaction.                        |
| `conversation:message_unsend`            | `conversation:message_unsent` (to participants)                                     | `{ messageId: UUID }`                                                              | Unsend (delete for everyone) a message.                         |
| `conversation:message_delete_for_me`     | `conversation:message_deleted_for_me` (to sender)                                   | `{ messageId: UUID }`                                                              | Delete a message only for the user who requested it.            |
| `conversation:message_read`              | `conversation:message_read` (to sender of the message)                              | `{ messageId: UUID }`                                                              | Acknowledge that a message was read.                            |
| `conversation:typing_start`              | `conversation:typing_start` (to other participants)                                 | `{ conversationId: UUID }`                                                         | Notify others that you started typing.                          |
| `conversation:typing_stop`               | `conversation:typing_stop` (to other participants)                                  | `{ conversationId: UUID }`                                                         | Notify others that you stopped typing.                          |
| _(AI Chat Triggered)_                    | `ai:chunk` (to you)                                                                 | _None_ (Triggered by sending message to AI)                                        | Receive a text chunk of the AI's streaming response.            |
| _(AI Chat Finished)_                     | `ai:done` (to you)                                                                  | _None_ (Triggered by AI finishing)                                                 | Notify that AI streaming is complete.                           |
| _(AI Chat Failed)_                       | `ai:error` (to you)                                                                 | _None_ (Triggered if AI fails)                                                     | Notify that the AI encountered an error.                        |
| `conversation:get_user_status`           | `conversation:user_status` (to you)                                                 | `{ userId: UUID }`                                                                 | Request the online/offline status of a user.                    |
| `conversation:set_user_status`           | `conversation:user_status_changed` (broadcast)                                      | `{ isOnline: boolean }`                                                            | Manually set your active status bounds.                         |
| _(on connect / disconnect)_              | `conversation:user_status_changed`                                                  | _None_                                                                             | Automatically broadcasted to users when you connect/disconnect. |

---

## 3. Payload Details & Explanations

### Loading Conversations & Messages

**Load All Conversations**  
_Emit_: `conversation:load_conversations`

```json
{
  "status": ["ACTIVE"] // Optional filter, e.g., 'ACTIVE', 'REQUESTED'
} 
```

**Conversation List Response**  
_Listen_: `conversation:conversation_list`  

```json
{
  "success": true,
  "message": "Conversations loaded successfully",
  "conversations": [
    {
      "id": "conversation-uuid",
      "type": "INDIVIDUAL", // or "GROUP"
      "status": "ACTIVE",
      "user1Id": "user1-uuid",
      "user2Id": "user2-uuid",
      "lastMessageId": "message-uuid",
      "lastMessage": {
        "content": "Hello!"
      }
    }
  ],
  "requests": [
    {
      "id": "conversation-uuid",
      "type": "INDIVIDUAL",
      "status": "REQUESTED"
    }
  ]
}
```

**Load Single Conversation Details**  
_Emit_: `conversation:load_single_conversation`

```json
{
  "conversationId": "conversation-uuid"
}
```

**Single Conversation Response**  
_Listen_: `conversation:load_single_conversation`

```json
{
  "success": true,
  "data": {
    "id": "conversation-uuid",
    "type": "INDIVIDUAL",
    "user1": { "id": "user1-uuid", "name": "Alice" },
    "user2": { "id": "user2-uuid", "name": "Bob" },
    "lastMessage": { "content": "Hi!" }
  }
}
```

**Load Conversation Messages**  
_Emit_: `conversation:conversation_messages`

```json
{
  "conversationId": "conversation-uuid",
  "page": 1,
  "limit": 20
}
```

**Messages Response**  
_Listen_: `conversation:conversation_messages`

```json
{
  "success": true,
  "data": [
    {
      "id": "message-uuid",
      "content": "Hello!",
      "createdAt": "2026-05-06T10:00:00.000Z",
      "sender": { "id": "sender-uuid", "name": "Sender Name" }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

---

### Sending & Receiving Messages

**Send a Message**  
_Emit_: `conversation:message_send`

```json
{
  "conversationId": "conversation-uuid",
  "content": "Hello! How are you?",
  "mediaUrl": "https://example.com/image.jpg",
  "mediaType": "IMAGE",
  "replyToId": "optional-uuid-of-message-replying-to",
  "forwardedFromId": "optional-uuid-of-message-forwarding-from"
}
```

_(Note: Either `content` or `mediaUrl/mediaType` must be provided)._

**Message Sent / Received**  
_Listen_: `conversation:message_sent` (sender) / `conversation:message_receive` (receiver)  
Both events share the same payload format.

```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "id": "message-uuid",
    "conversationId": "conversation-uuid",
    "content": "Hello! How are you?",
    "mediaUrl": null,
    "mediaType": null,
    "senderId": "sender-uuid",
    "sender": { "id": "sender-uuid", "name": "Sender Name" },
    "createdAt": "2026-05-06T10:00:00.000Z"
  }
}
```

---

### Advanced Message Actions

These events are triggered by the server in response to REST API calls (like POST `/message/:id/react`) to keep all clients synced in real-time.

**Message Reacted**  
_Listen_: `conversation:message_reacted`  
Indicates a user added or removed a reaction.

```json
{
  "messageId": "message-uuid",
  "conversationId": "conversation-uuid",
  "emoji": "👍",
  "action": "added", // or "removed"
  "userId": "user-uuid-who-reacted"
}
```

**Message Unsent**  
_Listen_: `conversation:message_unsent`  
Indicates a user unsent their message. The client should remove or hide the content.

```json
{
  "messageId": "message-uuid",
  "conversationId": "conversation-uuid"
}
```

**Message Deleted For Me**  
_Listen_: `conversation:message_deleted_for_me` (only to you)  
Indicates you deleted a message for yourself.

```json
{
  "messageId": "message-uuid",
  "conversationId": "conversation-uuid",
  "userId": "your-user-uuid"
}
```

---

### Read Receipts

**Mark a Message as Read**  
_Emit_: `conversation:message_read`

```json
{
  "messageId": "message-uuid-you-read"
}
```

**Read Receipt Notification**  
_Listen_: `conversation:message_read`  
Indicates the other user read your message.

```json
{
  "messageId": "message-uuid-they-read",
  "conversationId": "conversation-uuid",
  "readBy": "reader-user-uuid"
}
```

---

### Typing Indicators

**Start / Stop Typing**  
_Emit_: `conversation:typing_start` OR `conversation:typing_stop`

```json
{
  "conversationId": "conversation-uuid"
}
```

**User is Typing / Stopped Typing**  
_Listen_: `conversation:typing_start` OR `conversation:typing_stop`

```json
{
  "conversationId": "conversation-uuid",
  "userId": "typist-user-uuid"
}
```

---

### User Status & Presence

**Get User Status**  
_Emit_: `conversation:get_user_status`

```json
{
  "userId": "user-uuid"
}
```

**Status Response**  
_Listen_: `conversation:user_status`

```json
{
  "id": "user-uuid",
  "isOnline": true,
  "lastActiveAt": "2026-05-06T09:30:00.000Z"
}
```

**Set User Status**  
_Emit_: `conversation:set_user_status`

```json
{
  "isOnline": true
}
```

**Global Status Changes**  
_Listen_: `conversation:user_status_changed`  
Automatically triggered whenever any user connects, disconnects, or manually sets their status.

```json
{
  "userId": "user-uuid",
  "isOnline": true,
  "lastActiveAt": "2026-05-06T10:00:00.000Z"
}
```

---

### AI Chat & Streaming

**Initialize AI Conversation**  
Use this REST API endpoint to create or retrieve your conversation with the AI Assistant. This conversation will automatically appear in your `conversation_list` via sockets.
_HTTP POST_: `/conversation/ai/init` (Requires Bearer Token)
_Response_: Returns `{ success: true, conversation: { ... } }`

**Triggering AI Responses**  
You do not need a special event to talk to the AI. Simply send a message using the standard `conversation:message_send` event, targeting the AI conversation ID. The server will detect it's an AI chat and begin streaming.

**AI Stream Chunk**  
_Listen_: `ai:chunk`  
Provides real-time token-by-token streaming as the AI generates its reply.

```json
{
  "conversationId": "conversation-uuid",
  "chunk": "Hello! I am an "
}
```

**AI Stream Complete**  
_Listen_: `ai:done`  
Indicates the AI has finished its response. Once finished, a standard `conversation:message_receive` event is also fired containing the full saved message.

```json
{
  "conversationId": "conversation-uuid"
}
```

**AI Error**  
_Listen_: `ai:error`  

```json
{
  "message": "Failed to generate AI response"
}
```

---

## 4. REST API Endpoints (Groups & Advanced Messaging)

In addition to WebSockets, several features are managed via standard HTTP REST endpoints. All endpoints require a valid JWT Bearer token. Base path: `/conversation`.

### General & Groups
*   **POST** `/init` — Initialize or get an individual conversation with another user. Body: `{ userId: string }`
*   **POST** `/group` — Create a new group conversation. Body: `{ name: string, memberIds: string[], description?: string, avatarUrl?: string }`
*   **PATCH** `/group/:id` — Update a group conversation (name, members, avatar, etc.).
*   **DELETE** `/:id` — Delete a conversation entirely.
*   **DELETE** `/group/:id/member/:memberId` — Remove a member from a group.

### Conversation Management
*   **PATCH** `/:id/accept-request` — Accept a pending message request.
*   **PATCH** `/:id/decline-request` — Decline a pending message request.
*   **PATCH** `/:id/unread` — Toggle unread status of a conversation.
*   **DELETE** `/:id/delete-for-me` — Delete the conversation history for the current user only.
*   **PATCH** `/:id/pin` — Toggle pinned status.
*   **PATCH** `/:id/mute` — Toggle mute status. Body: `{ isMuted: boolean, mutedUntil?: string (ISO DateTime) }`
*   **PATCH** `/:id/block` — Toggle blocked status.
*   **POST** `/:id/report` — Report a conversation. Body: `{ reason: string }`

### Advanced Message Actions
*   **POST** `/message/:messageId/react` — React to a message. Body: `{ emoji: "👍" }`
*   **DELETE** `/message/:messageId/react` — Remove a reaction. Body: `{ emoji: "👍" }`
*   **POST** `/message/:messageId/reply` — Reply directly to a message. Body: `{ content?: string, mediaUrl?: string, mediaType?: Enum }`
*   **POST** `/message/:messageId/forward` — Forward a message. Body: `{ toConversationId: string }`
*   **POST** `/message/:messageId/unsend` — Unsend (delete for everyone) a message.
*   **DELETE** `/message/:messageId/delete-for-me` — Delete a message for the current user only.
