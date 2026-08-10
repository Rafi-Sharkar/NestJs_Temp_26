import { UserResponseDto } from '@/common/dto/user-response.dto';
import { ENVEnum } from '@/common/enum/env.enum';
import { JWTPayload, TokenPair } from '@/core/jwt/jwt.interface';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OtpType, User } from '@prisma';
import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';
import { randomBytes, randomInt } from 'crypto';

@Injectable()
export class AuthUtilsService {
  private saltRounds = 10;
  private refreshTokenDays = 30;
  private refreshTokenLength = 32;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async sanitizeUser<T = UserResponseDto>(user: User): Promise<T> {
    if (!user) return null as T;

    const flatData = {
      ...user,
    };

    return plainToInstance(UserResponseDto, flatData, {
      excludeExtraneousValues: true,
    }) as T;
  }

  generateToken(payload: JWTPayload): string {
    const token = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow(ENVEnum.JWT_SECRET),
      expiresIn: this.configService.getOrThrow(ENVEnum.JWT_EXPIRES_IN),
    });

    return token;
  }

  // ----------------save & generate token pair --------------------
  async generateTokenPairAndSave(payload: JWTPayload): Promise<TokenPair> {
    const accessToken = this.generateToken(payload);

    const refreshToken = randomBytes(
      Math.max(32, Math.floor(this.refreshTokenLength / 2)),
    ).toString('hex');

    const refreshTokenExpiresAt = new Date(
      Date.now() + this.refreshTokenDays * 24 * 60 * 60 * 1000,
    );

    // If we use the new session flow, we don't save to RefreshToken table
    if (!payload.sessionId) {
      await this.prisma.client.refreshToken.create({
        data: {
          token: refreshToken,
          userId: payload.sub,
          expiresAt: refreshTokenExpiresAt,
        },
      });
    }

    return {
      accessToken,
      refreshToken,
      refreshTokenExpiresAt,
    };
  }

  verifyToken<T extends object = any>(token: string): T {
    const secret = this.configService.getOrThrow<string>(ENVEnum.JWT_SECRET);
    try {
      return this.jwtService.verify<T>(token, { secret });
    } catch (err) {
      console.error(err);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  decodeToken(token: string): any {
    return this.jwtService.decode(token);
  }

  async revokeRefreshToken(token: string) {
    await this.prisma.client.refreshToken.deleteMany({ where: { token } });
  }

  async revokeAllRefreshTokensForUser(userId: string) {
    await this.prisma.client.refreshToken.deleteMany({ where: { userId } });
  }

  async findRefreshToken(token: string) {
    return this.prisma.client.refreshToken.findUnique({ where: { token } });
  }

  generateOtpAndExpiry(minutes = 5): { otp: number; expiryTime: Date } {
    const otp = randomInt(100000, 1000000); // 6-digit OTP (100000-999999)
    const expiryTime = new Date(Date.now() + minutes * 60 * 1000);
    return { otp, expiryTime };
  }

  async generateOTPAndSave(userId: string, type: OtpType) {
    const { otp, expiryTime } = this.generateOtpAndExpiry();
    const hashedOtp = await this.hash(otp.toString());
    await this.prisma.client.userOtp.create({
      data: {
        userId,
        code: hashedOtp,
        type,
        expiresAt: expiryTime,
      },
    });
    return otp;
  }

  async getSanitizedUserById(id: string) {
    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id },
    });

    return this.sanitizeUser<UserResponseDto>(user as any);
  }

  async getUserByEmail(email: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { email },
    });

    if (!user) return null;

    return this.sanitizeUser<UserResponseDto>(user as any);
  }

  async hash(value: string): Promise<string> {
    return bcrypt.hash(value, this.saltRounds);
  }

  async compare(value: string, hash: string): Promise<boolean> {
    return bcrypt.compare(value, hash);
  }

  generateRandomToken(length = 32): string {
    return randomBytes(length).toString('hex');
  }
}
