import { ENVEnum } from '@/common/enum/env.enum';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

@Injectable()
export class TwilioService {
  private readonly twilio: Twilio;
  private readonly fromPhone: string;
  private readonly logger = new Logger(TwilioService.name);

  constructor(private readonly config: ConfigService) {
    this.twilio = new Twilio(
      this.config.getOrThrow(ENVEnum.TWILIO_ACCOUNT_SID),
      this.config.getOrThrow(ENVEnum.TWILIO_AUTH_TOKEN),
    );
    this.fromPhone = this.config.getOrThrow(ENVEnum.TWILIO_PHONE_NUMBER);
  }

  // ─────────────────────────────────────────────
  // Send a raw SMS
  // ─────────────────────────────────────────────
  async sendSms(to: string, title: string, body: string): Promise<void> {
    // Ensure international format
    const formattedTo = to.startsWith('+') ? to : `+${to}`;

    const fullBody = `${title}\n\n${body}`;

    try {
      // ← renamed from `message` to `result` — was shadowing the `message` param
      const result = await this.twilio.messages.create({
        body: fullBody,
        from: this.fromPhone,
        to: formattedTo,
      });

      this.logger.log(`SMS sent successfully. SID: ${result.sid}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to send SMS to ${formattedTo}: ${error.message}`,
      );
      throw error;
    }
  }

  // ─────────────────────────────────────────────
  // Send OTP SMS (single entry-point — removed the identical duplicate)
  // ─────────────────────────────────────────────
  async sendOtpSms(to: string, otp: number): Promise<void> {
    const body = `Your Child Center verification code is ${otp}. It expires in 10 minutes. Do not share this code with anyone.`;
    await this.sendSms(to, 'Child Center Verification', body);
  }
}
