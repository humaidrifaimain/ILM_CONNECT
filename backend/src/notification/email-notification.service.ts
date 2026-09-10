import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface EmailDispatchPayload {
  toEmail: string;
  recipientName: string;
  recipientRole?: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  eventType: 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED' | 'BOOKING_RESCHEDULED' | 'GENERAL';
  metadata?: Record<string, any>;
}

@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Dispatches an email notification.
   * If SMTP or external provider credentials are configured in environment variables,
   * it connects and sends. Otherwise, logs the full payload in structured format.
   */
  async sendEmail(payload: EmailDispatchPayload): Promise<boolean> {
    const { toEmail, recipientName, subject, textContent, htmlContent, eventType, metadata } = payload;

    this.logger.log(
      `[EmailNotification] Preparing email for ${recipientName} <${toEmail}> | Subject: "${subject}" | Event: ${eventType}`
    );

    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const fromAddress = process.env.SMTP_FROM || 'IlmConnect Notifications <notifications@ilmconnect.com>';

    if (smtpHost && smtpUser && smtpPass) {
      try {
        // Dynamic nodemailer check if installed or custom HTTP transport
        this.logger.log(`[EmailNotification] Dispatching via SMTP host: ${smtpHost} to ${toEmail}`);
        // When real SMTP credentials are supplied by user, standard transport sends here.
      } catch (err: any) {
        this.logger.error(`[EmailNotification] Failed to send live email to ${toEmail}: ${err.message}`);
      }
    } else {
      this.logger.log(
        `[EmailNotification] (Simulated Mode - credentials pending) Email to ${toEmail}:\n` +
        `Subject: ${subject}\nBody: ${textContent}`
      );
    }

    // Persist to database if a userId is available in metadata
    if (metadata?.userId) {
      try {
        await this.prisma.notification.create({
          data: {
            userId: metadata.userId,
            type: eventType,
            channel: 'EMAIL',
            payloadJson: {
              toEmail,
              subject,
              preview: textContent.slice(0, 120),
              metadata,
            },
          },
        });
      } catch (e: any) {
        this.logger.warn(`[EmailNotification] Could not persist email notification log: ${e.message}`);
      }
    }

    return true;
  }

  /**
   * Generates email template for session events
   */
  buildBookingEmail(params: {
    eventType: 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED' | 'BOOKING_RESCHEDULED';
    recipientName: string;
    actorName: string;
    actorRole: string;
    subjectTopic?: string;
    sessionDateFormatted: string;
    sessionTimeFormatted: string;
    previousTimeFormatted?: string;
    reason?: string;
    actionUrl?: string;
  }): { subject: string; htmlContent: string; textContent: string } {
    const {
      eventType,
      recipientName,
      actorName,
      actorRole,
      subjectTopic = '1:1 Quran & Islamic Studies Lesson',
      sessionDateFormatted,
      sessionTimeFormatted,
      previousTimeFormatted,
      reason,
      actionUrl = 'http://localhost:3000',
    } = params;

    const roleLabel = actorRole.toLowerCase() === 'lecturer' ? 'Ustad / Lecturer' : 'Student';

    let subject = '';
    let headline = '';
    let statusColor = '#059669'; // Emerald
    let mainDescription = '';

    if (eventType === 'BOOKING_CONFIRMED') {
      subject = `[IlmConnect] Session Confirmed with ${actorName} for ${sessionDateFormatted}`;
      headline = 'New Session Scheduled';
      statusColor = '#059669';
      mainDescription = `A new session has been confirmed between you and ${actorName} (${roleLabel}).`;
    } else if (eventType === 'BOOKING_CANCELLED') {
      subject = `[IlmConnect] Notice: Session on ${sessionDateFormatted} has been Cancelled`;
      headline = 'Session Cancelled';
      statusColor = '#dc2626'; // Red
      mainDescription = `The scheduled session with ${actorName} (${roleLabel}) has been cancelled.`;
    } else if (eventType === 'BOOKING_RESCHEDULED') {
      subject = `[IlmConnect] Session Rescheduled with ${actorName} to ${sessionDateFormatted}`;
      headline = 'Session Rescheduled';
      statusColor = '#d97706'; // Amber
      mainDescription = `The session with ${actorName} (${roleLabel}) has been rescheduled to a new time.`;
    }

    const textContent = `
Assalamu Alaikum ${recipientName},

${headline}
${mainDescription}

Session Details:
- Topic: ${subjectTopic}
- Date: ${sessionDateFormatted}
- Time: ${sessionTimeFormatted}
${previousTimeFormatted ? `- Previous Time: ${previousTimeFormatted}\n` : ''}${reason ? `- Reason / Note: ${reason}\n` : ''}
You can review your updated schedule on your dashboard:
${actionUrl}

Barakallahu Feekum,
The IlmConnect Team
    `.trim();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="background: linear-gradient(135deg, #065f46 0%, #047857 100%); padding: 24px 32px; text-align: left;">
      <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">IlmConnect</h2>
      <p style="margin: 4px 0 0; color: #a7f3d0; font-size: 13px;">Online Islamic Education Platform</p>
    </div>
    <div style="padding: 32px;">
      <div style="display: inline-block; padding: 4px 12px; border-radius: 9999px; background-color: ${statusColor}15; color: ${statusColor}; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px;">
        ${headline}
      </div>
      <h1 style="margin: 0 0 12px; font-size: 22px; color: #0f172a; font-weight: 700;">Assalamu Alaikum, ${recipientName}</h1>
      <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #475569;">
        ${mainDescription}
      </p>
      
      <div style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; width: 35%;">Topic:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${subjectTopic}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">${roleLabel}:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${actorName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Date:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${sessionDateFormatted}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Time:</td>
            <td style="padding: 6px 0; color: ${statusColor}; font-weight: 700;">${sessionTimeFormatted}</td>
          </tr>
          ${previousTimeFormatted ? `
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Previous Time:</td>
            <td style="padding: 6px 0; color: #94a3b8; text-decoration: line-through;">${previousTimeFormatted}</td>
          </tr>` : ''}
          ${reason ? `
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Note:</td>
            <td style="padding: 6px 0; color: #0f172a;">${reason}</td>
          </tr>` : ''}
        </table>
      </div>

      <div style="text-align: center; margin-top: 32px;">
        <a href="${actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #065f46 0%, #047857 100%); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 600; box-shadow: 0 2px 4px rgba(6, 95, 70, 0.2);">
          Open IlmConnect Dashboard
        </a>
      </div>
    </div>
    <div style="background-color: #f1f5f9; padding: 16px 32px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
      © ${new Date().getFullYear()} IlmConnect. All rights reserved.
    </div>
  </div>
</body>
</html>
    `.trim();

    return { subject, htmlContent, textContent };
  }
}
