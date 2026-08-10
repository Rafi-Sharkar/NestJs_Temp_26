// src/common/decorators/throttle.decorator.ts
import { SetMetadata } from '@nestjs/common';
import {
  THROTTLE_SKIP_KEY,
  THROTTLE_CONFIG_KEY,
  CustomThrottleConfig,
} from './auth-throttler.guard';

export const SkipThrottle = () => SetMetadata(THROTTLE_SKIP_KEY, true);

export const CustomThrottle = (config: CustomThrottleConfig) =>
  SetMetadata(THROTTLE_CONFIG_KEY, config);

// Predefined decorators for auth endpoints
export const ThrottleLogin = () =>
  CustomThrottle({
    limit: 5,
    ttl: 900000, // 15 minutes
    name: 'auth:login',
    blockDuration: 1800000, // 30 minutes
  });

export const ThrottleSignup = () =>
  CustomThrottle({
    limit: 3,
    ttl: 3600000, // 1 hour
    name: 'auth:signup',
  });

export const ThrottleOtp = () =>
  CustomThrottle({
    limit: 3,
    ttl: 300000, // 5 minutes
    name: 'auth:otp',
  });

export const ThrottlePasswordReset = () =>
  CustomThrottle({
    limit: 3,
    ttl: 3600000, // 1 hour
    name: 'auth:password-reset',
  });

export const ThrottleRefreshToken = () =>
  CustomThrottle({
    limit: 10,
    ttl: 60000, // 1 minute
    name: 'auth:refresh-token',
  });

export const ThrottleVerifyEmail = () =>
  CustomThrottle({
    limit: 5,
    ttl: 600000, // 10 minutes
    name: 'auth:verify-email',
  });
