// auth.cookie.ts
import { Response } from 'express';

export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
  refreshExpiresAt: Date,
) => {
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
  });

  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: refreshExpiresAt,
  });
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
};
