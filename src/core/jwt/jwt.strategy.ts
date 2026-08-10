import { ENVEnum } from '@/common/enum/env.enum';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWTPayload } from './jwt.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const jwtSecret = config.getOrThrow<string>(ENVEnum.JWT_SECRET);

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JWTPayload) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // The Session table is intentionally absent from the current schema, so we
    // skip per-session revocation/lastActiveAt bookkeeping on the session row.
    // We still throttle the user's lastActiveAt update.
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (!user.lastActiveAt || user.lastActiveAt < fiveMinutesAgo) {
      await this.prisma.client.user.update({
        where: { id: payload.sub },
        data: { lastActiveAt: new Date() },
      });
    }

    return {
      ...payload,
      role: user.role,
      userType: user.userType,
    };
  }
}