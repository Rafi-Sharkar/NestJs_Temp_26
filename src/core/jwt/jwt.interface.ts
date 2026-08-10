import { Request } from 'express';

export interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  userType?: string;
  sessionId?: string;
  firebase_uid?: string;
}

export interface RequestWithUser extends Request {
  user?: JWTPayload;
}

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
};
