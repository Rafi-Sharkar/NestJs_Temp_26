export enum CallEvents {
  // user   info
  Call_User_Info = 'call:user-info',
  USER_STATUS_CHANGED = 'call:user-status-changed',

  // Lifecycle
  INITIATE = 'call:initiate',
  OUTGOING = 'call:outgoing', // ← confirmation sent back to caller after initiation
  INCOMING = 'call:incoming',
  RINGING = 'call:ringing',
  ACCEPT = 'call:accept',
  ACCEPTED = 'call:accepted',
  DECLINE = 'call:decline',
  DECLINED = 'call:declined',
  END = 'call:end',
  ENDED = 'call:ended',
  BUSY = 'call:busy',
  FAILED = 'call:failed',

  // WebRTC Signaling
  OFFER = 'webrtc:offer',
  ANSWER = 'webrtc:answer',
  ICE_CANDIDATE = 'webrtc:ice-candidate',

  // In-Call Controls
  TOGGLE_AUDIO = 'call:toggle-audio',
  TOGGLE_VIDEO = 'call:toggle-video',
  TOGGLE_SCREENSHARE = 'call:toggle-screenshare',
  PARTICIPANT_AUDIO_TOGGLED = 'call:participant-audio-toggled',
  PARTICIPANT_VIDEO_TOGGLED = 'call:participant-video-toggled',
  PARTICIPANT_SCREENSHARE_TOGGLED = 'call:participant-screenshare-toggled',
}
