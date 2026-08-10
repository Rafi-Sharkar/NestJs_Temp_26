/**
 * Socket Authentication Error Messages
 * These error messages are returned to the frontend via the 'connect_error' event
 * when WebSocket authentication fails in the middleware
 */
export enum AuthSocketError {
  MISSING_AUTH_HEADER = 'MISSING_AUTH_HEADER',
  INVALID_OR_EMPTY_TOKEN = 'INVALID_OR_EMPTY_TOKEN',
  SERVER_CONFIG_ERROR = 'SERVER_CONFIG_ERROR',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN_SIGNATURE = 'INVALID_TOKEN_SIGNATURE',
  TOKEN_VERIFICATION_FAILED = 'TOKEN_VERIFICATION_FAILED',
  MISSING_USER_ID = 'MISSING_USER_ID',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  AUTH_FAILED = 'AUTH_FAILED',
}
