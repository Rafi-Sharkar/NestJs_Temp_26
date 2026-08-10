// import { TwilioService } from '@/lib/twilio/twilio.service';
import { RedisModule } from '@/lib/redis/redis.module';
import { Module } from '@nestjs/common';
import { UploadModule } from '../upload-s3/upload.module';
import { AuthGetProfileService } from './services/auth-get-profile.service';
import { AuthLoginService } from './services/auth-login.service';
import { AuthLogoutService } from './services/auth-logout.service';
import { AuthOtpService } from './services/auth-otp.service';
import { AuthPasswordService } from './services/auth-password.service';
import { AuthRegisterService } from './services/auth-register.service';
import { AuthUpdateProfileService } from './services/auth-update-profile.service';
import { AdminAuthCreateUserService } from './services/admin-auth-create-user.service';
import { AdminAuthChangePasswordService } from './services/admin-auth-change-password.service';
import { AdminManageUsersService } from './services/admin-manage-users.service';
import { AuthController } from './controllers/auth.controller';
import { AdminAuthController } from './controllers/adminAuth.controller';
import { GoogleAuthService } from './services/google-auth.service';
import { AuthDeleteUserService } from './services/auth-delete-user.service';

@Module({
  imports: [UploadModule, RedisModule],
  controllers: [AuthController, AdminAuthController],
  providers: [
    AuthRegisterService,
    AuthLoginService,
    AuthLogoutService,
    AuthOtpService,
    AuthPasswordService,
    AuthGetProfileService,
    AuthUpdateProfileService,
    AdminAuthCreateUserService,
    AdminAuthChangePasswordService,
    AdminManageUsersService,
    GoogleAuthService,
    AuthDeleteUserService,
  ],
})
export class AuthModule {}