import { GetUser, ValidateAuth } from '@/core/jwt/jwt.decorator';

import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Res,
  UseInterceptors,
  UploadedFile,
  Ip,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { LoginDto } from '../dto/login.dto';
import { LogoutDto, RefreshTokenDto } from '../dto/logout.dto';
import { ResendOtpDto, VerifyOTPDto } from '../dto/otp.dto';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyPasswordOtpDto,
} from '../dto/password.dto';
import { RegisterDto } from '../dto/register.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { AuthGetProfileService } from '../services/auth-get-profile.service';
import { AuthLoginService } from '../services/auth-login.service';
import { AuthLogoutService } from '../services/auth-logout.service';
import { AuthOtpService } from '../services/auth-otp.service';
import { AuthPasswordService } from '../services/auth-password.service';
import { AuthRegisterService } from '../services/auth-register.service';
import { AuthUpdateProfileService } from '../services/auth-update-profile.service';
import { GoogleAuthDto } from '../dto/google-auth.dto';
import { GoogleAuthService } from '../services/google-auth.service';
import { UploadService } from '../../upload-s3/service/upload.service';
import { UpdateDeviceInfoDto } from '../dto/update-device-info.dto';
import { AuthDeleteUserService } from '../services/auth-delete-user.service';

@ApiTags('Auth ------> Completed')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authRegisterService: AuthRegisterService,
    private readonly authLoginService: AuthLoginService,
    private readonly authLogoutService: AuthLogoutService,
    private readonly authOtpService: AuthOtpService,
    private readonly authPasswordService: AuthPasswordService,
    private readonly authGetProfileService: AuthGetProfileService,
    private readonly authUpdateProfileService: AuthUpdateProfileService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly uploadService: UploadService,
    private readonly authDeleteUserService: AuthDeleteUserService,
  ) {}

  // --------------------- Registration ---------------------
  @ApiOperation({ summary: 'User Registration_TEST_OK' })
  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authRegisterService.register(body);
  }

  // --------------------- Verify OTP ---------------------
  @ApiOperation({ summary: 'Verify OTP after Registration or Login_TEST_OK' })
  @Post('verify-otp')
  async verifyEmail(
    @Body() body: VerifyOTPDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ) {
    const result = (await this.authOtpService.verifyOTP(
      body,
      body.type,
      ip,
    )) as any;

    if (result?.data?.token?.accessToken) {
      res.cookie('token', result.data.token.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }

    return result;
  }
  // --------------------- Verify Phone OTP ---------------------
  // @ApiOperation({ summary: 'Verify OTP for Phone Number' })
  // @Post('verify-phone-otp')
  // async verifyPhoneOtp(@Body() body: VerifyPhoneOtpDto) {
  //   return this.authOtpService.verifyPhoneOtp(body);
  // }
  // --------------------- Resend OTP ---------------------
  @ApiOperation({ summary: 'Resend OTP to Email_TEST_OK' })
  @Post('resend-otp')
  async resendOtp(@Body() body: ResendOtpDto) {
    return this.authOtpService.resendOtp(body);
  }
  // -------Resend OTP to Mobile-------
  // @ApiOperation({ summary: 'Resend OTP to Phone Number' })
  // @Post('resend-phone-otp')
  // async resendPhoneOtp(@Body() body: ResetPhoneOtpDto) {
  //   return this.authOtpService.resendPhoneOtp(body);
  // }
  // ---------------------- Firebase Google Login ---------------------
  @ApiOperation({ summary: 'Google Sign-In with Firebase' })
  @Post('google')
  async googleLogin(
    @Body() dto: GoogleAuthDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ) {
    const result = await this.googleAuthService.googleLogin(dto, ip);

    //------- Set HTTP-only cookie---------
    res.cookie('token', result?.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return { result, message: 'Google login successful' };
  }

  // --------------------- Login ---------------------
  @ApiOperation({ summary: 'User Login_TEST_OK' })
  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ) {
    const result = (await this.authLoginService.login(body, ip)) as any;
    if (result?.data?.token?.accessToken) {
      //------- Set HTTP-only cookie---------
      res.cookie('token', result.data.token.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }

    return result;
  }

  @ApiOperation({ summary: 'User Logout_TEST_OK' })
  @ApiBearerAuth()
  @Post('logout')
  @ValidateAuth()
  async logOut(@GetUser('sub') userId: string, @Body() dto: LogoutDto) {
    return this.authLogoutService.logout(userId, dto);
  }

  @Post('refresh')
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authLogoutService.refresh(dto);

    //------- Set HTTP-only cookie---------
    res.cookie('token', result?.data?.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return { result, message: 'Login successful' };
  }

  @ApiOperation({ summary: 'Change Password_TEST_OK' })
  @ApiBearerAuth()
  @Post('password/change')
  @ValidateAuth()
  async changePassword(
    @GetUser('sub') userId: string,
    @Body() body: ChangePasswordDto,
  ) {
    return this.authPasswordService.changePassword(userId, body);
  }
  // --------------------- forgot password ---------------------
  @ApiOperation({ summary: 'Forgot Password_TEST_OK' })
  @Post('password/forgot')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authPasswordService.forgotPassword(body.email);
  }

  // --------------------- verify password reset otp ---------------------
  @ApiOperation({ summary: 'Verify Password Reset OTP and Get Token_TEST_OK' })
  @Post('password/verify-otp')
  async verifyPasswordOtp(@Body() body: VerifyPasswordOtpDto) {
    return this.authPasswordService.verifyPasswordOtp(body);
  }

  // --------------------- reset password ---------------------
  @ApiOperation({ summary: 'Reset Password_TEST_OK' })
  @Post('password/reset')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authPasswordService.resetPassword(body);
  }

  // --------------------- Get profile ---------------------
  @ApiOperation({ summary: 'Get User Profile_TEST_OK' })
  @ApiBearerAuth()
  @Get('profile')
  @ValidateAuth()
  async getProfile(@GetUser('sub') userId: string) {
    return this.authGetProfileService.getProfile(userId);
  }

  // --------------------- Update profile ---------------------
  @ApiOperation({ summary: 'Update profile_TEST_OK' })
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data', 'application/json')
  @Patch('profile')
  @UseInterceptors(FileInterceptor('profilePhoto'))
  @ValidateAuth()
  async update(
    @GetUser('sub') id: string,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() profilePhoto?: Express.Multer.File,
  ) {
    if (profilePhoto) {
      const uploadResult = await this.uploadService.uploadFiles([profilePhoto]);
      if (
        uploadResult.data &&
        uploadResult.data.files &&
        uploadResult.data.files.length > 0
      ) {
        dto.profilePhoto = uploadResult.data.files[0].id;
      }
    }
    return this.authUpdateProfileService.updateProfile(id, dto);
  }

  // --------------------- Update device info ---------------------
  @ApiOperation({ summary: 'Update Device Info / FCM Token' })
  @ApiBearerAuth()
  @Patch('device-info')
  @ValidateAuth()
  async updateDeviceInfo(
    @GetUser('sessionId') sessionId: string,
    @Body() dto: UpdateDeviceInfoDto,
  ) {
    return this.authLoginService.updateDeviceInfo(sessionId, dto);
  }

  // --------------------- Delete user ---------------------
  @ApiOperation({
    summary: 'Delete current user account and all associated data',
  })
  @ApiBearerAuth()
  @Delete()
  @ValidateAuth()
  async deleteUser(@GetUser('sub') userId: string) {
    return this.authDeleteUserService.deleteUser(userId);
  }
}
