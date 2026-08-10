// ─────────────────────────────────────────────
// Brand Color Tokens (from color.jpg)
// ─────────────────────────────────────────────
// Primary Dark      : #0A0E27
// Secondary Dark    : #1A1F3A
// Text Light        : #FFFFFF
// Text Secondary    : #A0A8B8
// Gold Accent       : #E8B923
// Success Green     : #10B981
// Destructive Red   : #EF4444
// Neutral Gray      : #6B7280
// ─────────────────────────────────────────────

import { ENVEnum } from '@/common/enum/env.enum';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;
  private logoUrl: string;

  constructor(private configService: ConfigService) {
    // Gmail SMTP Configuration
    const GMAIL_HOST = 'smtp.gmail.com';
    const GMAIL_PORT = 587;

    const user = this.configService.getOrThrow<string>(ENVEnum.MAIL_USER);
    const pass = this.configService.getOrThrow<string>(ENVEnum.MAIL_PASS);
    this.logoUrl = this.configService.getOrThrow<string>(ENVEnum.logo_URL);

    if (!user || !pass) {
      throw new Error(
        'MAIL_USER and MAIL_PASS must be configured in .env\n' +
          'MAIL_USER: your Gmail email address\n' +
          'MAIL_PASS: your Gmail App Password (16-character password from https://myaccount.google.com/apppasswords)',
      );
    }

    this.fromEmail = user;
    this.transporter = nodemailer.createTransport({
      host: GMAIL_HOST,
      port: GMAIL_PORT,
      secure: false, // TLS (not SSL)
      auth: { user, pass },
    });

    // Verify connection on startup
    this.verifyConnection();
  }

  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      console.log('✓ Gmail SMTP service connected successfully');
    } catch (error: any) {
      console.error(
        '✗ Gmail SMTP connection failed:',
        error.message,
        '\nFix: Ensure MAIL_USER and MAIL_PASS are set correctly in .env',
        '\nMAIL_USER should be your Gmail address',
        '\nMAIL_PASS should be your 16-character App Password from https://myaccount.google.com/apppasswords',
      );
    }
  }

  public async sendMail({
    to,
    subject,
    html,
    text,
  }: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<nodemailer.SentMessageInfo> {
    try {
      return await this.transporter.sendMail({
        from: `"Raiz App Registration" <${this.fromEmail}>`,
        to,
        subject,
        html,
        text,
      });
    } catch (error: any) {
      console.error('Email sending failed:', {
        to,
        subject,
        error: error.message,
      });
      throw new Error(
        `Email service error: ${error.message}. Check that MAIL_USER and MAIL_PASS are correctly set in .env (use Gmail App Password).`,
      );
    }
  }

  /** Shared logo URL getter – use inside templates via mailService.logoUrl */
  public getLogoUrl(): string {
    return this.logoUrl;
  }
}

// ─────────────────────────────────────────────
// Shared layout helpers (DRY)
// ─────────────────────────────────────────────

/** Top header bar with logo */
const headerBlock = (logoUrl: string) => `
  <div style="background-color:#0A0E27; padding:22px 0; border-radius:12px 12px 0 0;">
    <div style="text-align:center;">
      <img
        src="${logoUrl}"
        alt="ChildCareRegister Logo"
        style="max-height:38px; width:auto;"
      />
    </div>
  </div>
`;

/** Bottom footer bar */
const footerBlock = (footerText: string) => `
  <div style="background-color:#1A1F3A; padding:20px 28px; border-radius:0 0 12px 12px; text-align:center;">
    <p style="margin:0; font-size:13px; color:#A0A8B8; font-family:'Segoe UI',Arial,sans-serif; line-height:1.5;">
      ${footerText}
    </p>
  </div>
`;

/** Outer wrapper (background + centering) */
const wrap = (innerHtml: string) => `
<div style="font-family:'Segoe UI',Arial,sans-serif; background-color:#0f1220; min-height:100%; padding:36px 16px; margin:0; box-sizing:border-box;">
  <div style="max-width:560px; margin:0 auto; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.35);">
    ${innerHtml}
  </div>
</div>
`;

// ─────────────────────────────────────────────
// OTP Template
// ─────────────────────────────────────────────

export const otpTemplate = ({
  title,
  message,
  code,
  footer,
  logoUrl,
}: {
  title: string;
  message: string;
  code: string;
  footer: string;
  logoUrl: string;
}) =>
  wrap(`
  ${headerBlock(logoUrl)}

  <!-- Body -->
  <div style="background-color:#ffffff; padding:36px 32px 28px;">

    <!-- Title -->
    <h2 style="margin:0 0 16px; text-align:center; font-size:22px; font-weight:700; color:#0A0E27; font-family:'Segoe UI',Arial,sans-serif;">
      ${title}
    </h2>

    <!-- Divider accent -->
    <div style="width:48px; height:3px; background-color:#E8B923; margin:0 auto 22px; border-radius:2px;"></div>

    <!-- Message -->
    <p style="font-size:15px; color:#6B7280; line-height:1.7; margin:0 0 28px; text-align:center; font-family:'Segoe UI',Arial,sans-serif;">
      ${message}
    </p>

    <!-- OTP Box -->
    <div style="background-color:#0A0E27; border-radius:10px; padding:24px 16px; text-align:center; margin-bottom:24px;">
      <p style="margin:0 0 6px; font-size:13px; color:#A0A8B8; text-transform:uppercase; letter-spacing:1.4px; font-family:'Segoe UI',Arial,sans-serif;">
        Your Verification Code
      </p>
      <p style="margin:0; font-size:36px; font-weight:700; color:#E8B923; letter-spacing:10px; font-family:'Courier New',monospace;">
        ${code}
      </p>
    </div>

    <!-- Expiry note -->
    <p style="font-size:13px; color:#A0A8B8; text-align:center; margin:0; font-family:'Segoe UI',Arial,sans-serif; line-height:1.5;">
      This code expires in <strong style="color:#6B7280;">10 minutes</strong>. Do not share it with anyone.
    </p>
  </div>

  ${footerBlock(footer)}
`);

// ─────────────────────────────────────────────
// Password Reset Confirmation Template
// ─────────────────────────────────────────────

export const passwordResetConfirmationTemplate = (
  message: string,
  logoUrl: string,
) =>
  wrap(`
  ${headerBlock(logoUrl)}

  <!-- Body -->
  <div style="background-color:#ffffff; padding:36px 32px 28px;">

    <!-- Success Icon Circle -->
    <div style="text-align:center; margin-bottom:20px;">
      <div style="display:inline-block; width:64px; height:64px; border-radius:50%; background-color:#ecfdf5; border:3px solid #10B981; line-height:58px;">
        <span style="font-size:28px; color:#10B981;">&#10003;</span>
      </div>
    </div>

    <!-- Title -->
    <h2 style="margin:0 0 12px; text-align:center; font-size:22px; font-weight:700; color:#0A0E27; font-family:'Segoe UI',Arial,sans-serif;">
      Password Reset Successful
    </h2>

    <!-- Divider accent -->
    <div style="width:48px; height:3px; background-color:#10B981; margin:0 auto 22px; border-radius:2px;"></div>

    <!-- Message -->
    <p style="font-size:15px; color:#6B7280; line-height:1.7; margin:0 0 20px; text-align:center; font-family:'Segoe UI',Arial,sans-serif;">
      ${message}
    </p>

    <!-- Security Warning Box -->
    <div style="background-color:#fef2f2; border-left:4px solid #EF4444; border-radius:6px; padding:14px 18px; margin-bottom:8px;">
      <p style="margin:0; font-size:13px; color:#EF4444; line-height:1.6; font-family:'Segoe UI',Arial,sans-serif;">
        <strong>Security Notice:</strong> If you did not initiate this change, please reset your password immediately and contact our support team.
      </p>
    </div>
  </div>

  ${footerBlock('Need help? Contact our support team at <a href="mailto:support@galaxybooking.com" style="color:#E8B923; text-decoration:none;">support@galaxybooking.com</a>')}
`);

// ─────────────────────────────────────────────
// Password Reset LINK Template (bonus)
// ─────────────────────────────────────────────

export const passwordResetLinkTemplate = ({
  resetUrl,
  logoUrl,
}: {
  resetUrl: string;
  logoUrl: string;
}) =>
  wrap(`
  ${headerBlock(logoUrl)}

  <!-- Body -->
  <div style="background-color:#ffffff; padding:36px 32px 28px;">

    <!-- Title -->
    <h2 style="margin:0 0 16px; text-align:center; font-size:22px; font-weight:700; color:#0A0E27; font-family:'Segoe UI',Arial,sans-serif;">
      Reset Your Password
    </h2>

    <!-- Divider accent -->
    <div style="width:48px; height:3px; background-color:#E8B923; margin:0 auto 22px; border-radius:2px;"></div>

    <!-- Message -->
    <p style="font-size:15px; color:#6B7280; line-height:1.7; margin:0 0 28px; text-align:center; font-family:'Segoe UI',Arial,sans-serif;">
      We received a request to reset your password. Click the button below to create a new one.
    </p>

    <!-- CTA Button -->
    <div style="text-align:center; margin-bottom:24px;">
      <a
        href="${resetUrl}"
        style="display:inline-block; background-color:#0A0E27; color:#E8B923; font-size:15px; font-weight:600; padding:14px 36px; border-radius:8px; text-decoration:none; font-family:'Segoe UI',Arial,sans-serif; letter-spacing:0.5px;"
      >
        Reset Password
      </a>
    </div>

    <!-- Fallback link -->
    <p style="font-size:13px; color:#A0A8B8; text-align:center; margin:0; font-family:'Segoe UI',Arial,sans-serif; line-height:1.6;">
      If the button doesn't work, copy and paste the link below:<br/>
      <a href="${resetUrl}" style="color:#E8B923; text-decoration:none; word-break:break-all; font-size:12px;">${resetUrl}</a>
    </p>

    <!-- Expiry note -->
    <p style="font-size:13px; color:#A0A8B8; text-align:center; margin:16px 0 0; font-family:'Segoe UI',Arial,sans-serif;">
      This link expires in <strong style="color:#6B7280;">1 hour</strong>.
    </p>
  </div>

  ${footerBlock('If you did not request a password reset, you can safely ignore this email.<br/><a href="mailto:support@galaxybooking.com" style="color:#E8B923; text-decoration:none;">Contact Support</a>')}
`);
