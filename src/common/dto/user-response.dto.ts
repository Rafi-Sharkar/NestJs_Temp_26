import { UserRole, UserStatus, UserType, GenderType } from '@prisma';
import { Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  id: string;

  // ===== Identity =====
  @Expose()
  fullName?: string;

  @Expose()
  name: string;

  @Expose()
  email: string;

  // ===== Settings =====
  @Expose()
  role: UserRole;

  @Expose()
  biography?: string;

  @Expose()
  gender?: GenderType;

  @Expose()
  userType?: UserType;

  @Expose()
  isNormal: boolean;

  @Expose()
  isCreator: boolean;

  @Expose()
  isBrand: boolean;

  @Expose()
  status: UserStatus;

  @Expose()
  isVerified: boolean;

  @Expose()
  isOnline: boolean;

  @Expose()
  isPhoneVerified: boolean;

  // ===== Follow stats =====
  @Expose()
  followers?: number;

  @Expose()
  following?: number;

  // ===== Logout / activity tracking =====
  @Expose()
  lastLoginAt?: Date;

  @Expose()
  lastActiveAt?: Date;

  // ===== Avatar =====
  @Expose()
  profilePhoto?: string;

  // ===== Meta =====
  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
