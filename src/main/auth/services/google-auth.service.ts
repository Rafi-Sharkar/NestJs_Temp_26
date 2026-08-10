import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { GoogleAuthDto } from '../dto/google-auth.dto';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../lib/prisma/prisma.service';
import { getFirebaseAdmin } from '../../../lib/firebase/firebase.config';
import { AuthUtilsService } from '../../../lib/utils/services/auth-utils.service';

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly utils: AuthUtilsService,
  ) {}

  async googleLogin(dto: GoogleAuthDto, ip: string = '0.0.0.0') {
    const { idToken, referToken } = dto;
    // 1. Verify Firebase ID token
    const firebase = getFirebaseAdmin();
    if (!firebase) {
      throw new UnauthorizedException(
        'Firebase is not configured — Google sign-in is unavailable.',
      );
    }
    let decoded: any;
    try {
      decoded = await firebase.auth().verifyIdToken(idToken);
    } catch (error) {
      throw new UnauthorizedException('Invalid Firebase ID token');
    }

    // 2. Extract user data from Firebase token
    const firebaseUid = decoded.uid;
    const email = decoded.email || '';
    const fullName = decoded.name || email.split('@')[0];
    const profilePhoto = decoded.picture || null;

    // 3. Upsert user in database
    const existingUser = await this.prisma.client.user.findUnique({
      where: { firebase_uid: firebaseUid },
    });

    const user = await this.upsertFromFirebase({
      firebase_uid: firebaseUid,
      email,
      fullName,
      profilePhotoUrl: profilePhoto,
    });

    // The Session table is intentionally absent from the current schema.
    // We mint a synthetic sessionId so JWT payloads keep a stable shape.
    const sessionId = `${user.id}-${Date.now()}`;

    // 4. Issue JWT access and refresh token pair
    const token = await this.utils.generateTokenPairAndSave({
      sub: user.id,
      firebase_uid: user.firebase_uid,
      email: user.email,
      role: user.role,
      userType: user.userType ?? undefined,
      sessionId,
    });

    // 5. Return user details with access token
    return {
      firebase_uid: user.firebase_uid,
      email: user.email,
      fullName: user.fullName,
      photoUrl: user.profilePhoto?.url || null,
      provider: 'google',
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
    };
  }

  private async upsertFromFirebase(data: {
    firebase_uid: string;
    email: string;
    fullName: string;
    profilePhotoUrl: string | null;
  }): Promise<any> {
    return this.prisma.client.user.upsert({
      where: { firebase_uid: data.firebase_uid },
      update: {
        email: data.email,
        fullName: data.fullName,
      },
      create: {
        firebase_uid: data.firebase_uid,
        email: data.email,
        name: data.email.split('@')[0] + Math.floor(Math.random() * 1000),
        fullName: data.fullName,
        profilePhoto: data.profilePhotoUrl
          ? {
              create: {
                filename: 'google-auth-profile',
                originalFilename: 'google-auth-profile',
                path: data.profilePhotoUrl,
                url: data.profilePhotoUrl,
                mimeType: 'image/jpeg',
                size: 0,
              },
            }
          : undefined,
        password: '', // Social login users don't have a password initially
        provider: 'google',
        userType: 'NORMAL',
        isNormal: true,
      },
      include: {
        profilePhoto: true,
      },
    });
  }

  async findByFirebaseUid(firebase_uid: string): Promise<any | null> {
    return this.prisma.client.user.findUnique({ where: { firebase_uid } });
  }
}