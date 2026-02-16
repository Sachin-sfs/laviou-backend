import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';
import type { AppEnv } from '../config/env';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  private isConfigured = false;
  private fromEmail: string | null = null;

  constructor(private readonly config: ConfigService<AppEnv, true>) {
    const apiKey = this.config.get('SENDGRID_API_KEY', { infer: true });
    const fromEmail = this.config.get('SENDGRID_FROM_EMAIL', { infer: true });

    if (apiKey && fromEmail) {
      try {
        sgMail.setApiKey(apiKey);
        this.isConfigured = true;
        this.fromEmail = fromEmail;
      } catch (e: unknown) {
        // Don't crash the app in development due to misconfiguration.
        // In production, env validation should enforce a correct setup.
        this.logger.error('Failed to initialize SendGrid', e as Error);
        this.isConfigured = false;
        this.fromEmail = null;
      }
    }
  }

  async sendPasswordResetOtp(toEmail: string, otp: string): Promise<void> {
    const nodeEnv = this.config.get('NODE_ENV', { infer: true });

    if (!this.isConfigured || !this.fromEmail) {
      // Dev-friendly fallback: don’t block local testing if SendGrid isn’t configured.
      if (nodeEnv !== 'production') {
        this.logger.warn(`SendGrid not configured. OTP for ${toEmail}: ${otp}`);
        return;
      }
      throw new Error('SendGrid is not configured');
    }

    try {
      await sgMail.send({
        to: toEmail,
        from: this.fromEmail,
        subject: 'Your Laviou password reset code',
        text: `Your password reset code is: ${otp}\n\nThis code expires in 10 minutes.`,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.5">
            <h2>Password reset</h2>
            <p>Your password reset code is:</p>
            <p style="font-size:28px;letter-spacing:4px;font-weight:bold">${otp}</p>
            <p>This code expires in <b>10 minutes</b>.</p>
            <p>If you didn't request this, you can ignore this email.</p>
          </div>
        `,
      });
    } catch (e: unknown) {
      // In dev, allow testing without blocking on email delivery.
      if (nodeEnv !== 'production') {
        this.logger.error(
          `SendGrid send failed; falling back to console OTP for ${toEmail}`,
          e as Error,
        );
        this.logger.warn(`OTP for ${toEmail}: ${otp}`);
        return;
      }
      throw e;
    }
  }
}
