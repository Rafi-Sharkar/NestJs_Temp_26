import { Injectable } from '@nestjs/common';
import * as he from 'he';
import * as nodemailer from 'nodemailer';
import { MailService } from '../mail.service';
import { LoginCredentials, otpTemplate } from '../templates/otp.template';
import { passwordResetConfirmationTemplate } from '../templates/reset-password-confirm.template';
import { registrationApprovedTemplate } from '../templates/registration-approved.template';

interface EmailOptions {
  subject?: string;
  message?: string;
  loginEmail?: string;
  loginPassword?: string;
}

@Injectable()
export class AuthMailService {
  constructor(private readonly mailService: MailService) {}

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<nodemailer.SentMessageInfo> {
    return this.mailService.sendMail({ to, subject, html, text });
  }

  private sanitize(input: string): string {
    return he.encode(input);
  }

  async sendVerificationCodeEmail(
    to: string,
    code: string,
    options: EmailOptions = {},
  ): Promise<nodemailer.SentMessageInfo> {
    const message = this.sanitize(options.message || 'Verify your account');
    const safeCode = this.sanitize(code);
    const subject = options.subject || 'Verification Code';
    const safeLoginEmail = options.loginEmail
      ? this.sanitize(options.loginEmail)
      : undefined;
    const safeLoginPassword = options.loginPassword
      ? this.sanitize(options.loginPassword)
      : undefined;
    const loginText =
      options.loginEmail && options.loginPassword
        ? `\nLogin email: ${options.loginEmail}\nLogin password: ${options.loginPassword}`
        : '';

    return this.sendEmail(
      to,
      subject,
      otpTemplate({
        title: 'Verify Your Account',
        message,
        code: safeCode,
        loginEmail: safeLoginEmail,
        loginPassword: safeLoginPassword,
        footer:
          'If you did not request this code, you can safely ignore this email.',
        logoUrl:
          process.env.LOGO_URL ||
          'https://via.placeholder.com/150x50/0A0E27/E8B923?text=GalaxyBooking',
      }),
      `${message}${loginText}\nYour verification code: ${code}`,
    );
  }

  async sendResetPasswordCodeEmail(
    to: string,
    code: string,
    options: EmailOptions = {},
  ): Promise<nodemailer.SentMessageInfo> {
    const message = this.sanitize(options.message || 'Password Reset Request');
    const safeCode = this.sanitize(code);
    const subject = options.subject || 'Password Reset Code';

    return this.sendEmail(
      to,
      subject,
      otpTemplate({
        title: 'Password Reset Request',
        message,
        code: safeCode,
        footer:
          'If you did not request a password reset, you can safely ignore this email.',
        logoUrl:
          process.env.LOGO_URL ||
          'https://via.placeholder.com/150x50/0A0E27/E8B923?text=GalaxyBooking',
      }),
      `${message}\nYour password reset code: ${code}\n\nIf you did not request this, please ignore this email.`,
    );
  }

  async sendLoginCredentials(
    to: string,
    options: EmailOptions = {},
  ): Promise<nodemailer.SentMessageInfo> {
    const message = this.sanitize(
      options.message ||
        'Your account is ready. Use the login credentials below to sign in.',
    );
    const subject = options.subject || 'Login Credentials';
    const safeLoginEmail = options.loginEmail
      ? this.sanitize(options.loginEmail)
      : undefined;
    const safeLoginPassword = options.loginPassword
      ? this.sanitize(options.loginPassword)
      : undefined;
    const loginText =
      options.loginEmail && options.loginPassword
        ? `\nLogin email: ${options.loginEmail}\nLogin password: ${options.loginPassword}`
        : '';

    return this.sendEmail(
      to,
      subject,
      LoginCredentials({
        title: 'Your Login Credentials',
        message,
        loginEmail: safeLoginEmail,
        loginPassword: safeLoginPassword,
        footer:
          'If you did not request this account, please contact support immediately.',
        logoUrl:
          process.env.LOGO_URL ||
          'https://via.placeholder.com/150x50/0A0E27/E8B923?text=GalaxyBooking',
      }),
      `${message}${loginText}`,
    );
  }

  async sendPasswordResetConfirmationEmail(
    to: string,
    options: EmailOptions = {},
  ): Promise<nodemailer.SentMessageInfo> {
    const message = this.sanitize(
      options.message || 'Your password has been successfully updated.',
    );
    const subject = options.subject || 'Password Reset Confirmation';

    return this.sendEmail(
      to,
      subject,
      passwordResetConfirmationTemplate(message, this.mailService.getLogoUrl()),
      message,
    );
  }

  async sendRegistrationApprovedEmail(
    to: string,
    options: EmailOptions = {},
  ): Promise<nodemailer.SentMessageInfo> {
    const message = this.sanitize(
      options.message ||
        "Your child's registration has been approved. Welcome to our community!",
    );
    const subject = options.subject || 'Your Registration Is Approved';

    return this.sendEmail(
      to,
      subject,
      registrationApprovedTemplate(message, this.mailService.getLogoUrl()),
      message,
    );
  }
}
