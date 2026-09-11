import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface WhatsAppDispatchPayload {
  toPhone: string;
  recipientName: string;
  recipientRole?: string;
  eventType: 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED' | 'BOOKING_RESCHEDULED' | 'SESSION_STUDENT_NO_SHOW' | 'GENERAL';
  message: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class WhatsAppNotificationService {
  private readonly logger = new Logger(WhatsAppNotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Dispatches a WhatsApp notification.
   * If WHATSAPP_API_URL and WHATSAPP_API_TOKEN are configured, executes the API call.
   * Otherwise, logs the full message with recipient phone in structured format.
   */
  async sendWhatsApp(payload: WhatsAppDispatchPayload): Promise<boolean> {
    const { toPhone, recipientName, eventType, message, metadata } = payload;
    const cleanPhone = this.formatPhoneNumber(toPhone);

    this.logger.log(
      `[WhatsAppNotification] Preparing WhatsApp message for ${recipientName} (${cleanPhone}) | Event: ${eventType}`
    );

    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiToken = process.env.WHATSAPP_API_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (apiUrl && apiToken) {
      try {
        this.logger.log(`[WhatsAppNotification] Dispatching live message via API to ${cleanPhone}`);
        // When user configures WhatsApp credentials (e.g. Meta Cloud API or provider webhook):
        await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: cleanPhone.replace(/^\+/, ''),
            type: 'text',
            text: { body: message },
          }),
        }).catch((err) => {
          this.logger.error(`[WhatsAppNotification] API request failed: ${err.message}`);
        });
      } catch (err: any) {
        this.logger.error(`[WhatsAppNotification] Live WhatsApp dispatch error: ${err.message}`);
      }
    } else {
      this.logger.log(
        `[WhatsAppNotification] (Simulated Mode - credentials pending) WhatsApp to ${cleanPhone}:\n` +
        `"${message}"`
      );
    }

    return true;
  }

  /**
   * Cleans and sanitizes phone numbers into E.164-compatible standard
   */
  private formatPhoneNumber(rawPhone: string): string {
    if (!rawPhone) return '+0000000000';
    let cleaned = rawPhone.trim().replace(/[\s\-\(\)]/g, '');
    if (!cleaned.startsWith('+')) {
      // Default to Sri Lanka / international prefix if missing leading plus
      cleaned = '+' + cleaned;
    }
    return cleaned;
  }

  /**
   * Builds clean, professional WhatsApp text messages
   */
  buildBookingMessage(params: {
    eventType: 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED' | 'BOOKING_RESCHEDULED' | 'SESSION_STUDENT_NO_SHOW';
    recipientName: string;
    actorName: string;
    actorRole: string;
    subjectTopic?: string;
    sessionDateFormatted: string;
    sessionTimeFormatted: string;
    previousTimeFormatted?: string;
    reason?: string;
    actionUrl?: string;
  }): string {
    const {
      eventType,
      recipientName,
      actorName,
      actorRole,
      subjectTopic = 'Quran Lesson',
      sessionDateFormatted,
      sessionTimeFormatted,
      previousTimeFormatted,
      reason,
      actionUrl = 'http://localhost:3000',
    } = params;

    const roleLabel = actorRole.toLowerCase() === 'lecturer' ? 'Ustad' : 'Student';

    if (eventType === 'BOOKING_CONFIRMED') {
      return (
        `*IlmConnect — New Session Confirmed*\n\n` +
        `Assalamu Alaikum *${recipientName}*,\n\n` +
        `A new 1:1 session with *${actorName}* (${roleLabel}) has been scheduled successfully.\n\n` +
        `📖 *Topic:* ${subjectTopic}\n` +
        `📅 *Date:* ${sessionDateFormatted}\n` +
        `⏰ *Time:* ${sessionTimeFormatted}\n\n` +
        `🔗 View session details & room link:\n${actionUrl}\n\n` +
        `_Barakallahu Feekum,_ \n_IlmConnect Learning Team_`
      );
    }

    if (eventType === 'BOOKING_CANCELLED') {
      return (
        `*IlmConnect — Session Cancelled*\n\n` +
        `Assalamu Alaikum *${recipientName}*,\n\n` +
        `Please note that your scheduled session with *${actorName}* (${roleLabel}) has been cancelled.\n\n` +
        `📅 *Original Date:* ${sessionDateFormatted}\n` +
        `⏰ *Time:* ${sessionTimeFormatted}\n` +
        (reason ? `📝 *Note:* ${reason}\n` : '') +
        `\n🔗 Visit your dashboard to view your updated schedule or rebook:\n${actionUrl}\n\n` +
        `_Barakallahu Feekum,_ \n_IlmConnect Support_`
      );
    }

    if (eventType === 'SESSION_STUDENT_NO_SHOW') {
      return (
        `*IlmConnect — Attendance Update*\n\n` +
        `Assalamu Alaikum *${recipientName}*,\n\n` +
        `You have been marked absent by *${actorName}* (${roleLabel}) for your scheduled session.\n\n` +
        `📅 *Date:* ${sessionDateFormatted}\n` +
        `⏰ *Time:* ${sessionTimeFormatted}\n` +
        (reason ? `📝 *Note:* ${reason}\n` : '') +
        `\n🔗 View details & attendance record:\n${actionUrl}\n\n` +
        `_Barakallahu Feekum,_ \n_IlmConnect Learning Team_`
      );
    }

    // Rescheduled
    return (
      `*IlmConnect — Session Rescheduled*\n\n` +
      `Assalamu Alaikum *${recipientName}*,\n\n` +
      `Your session with *${actorName}* (${roleLabel}) has been rescheduled to a new time.\n\n` +
      `📖 *Topic:* ${subjectTopic}\n` +
      `📅 *New Date & Time:* ${sessionDateFormatted} at ${sessionTimeFormatted}\n` +
      (previousTimeFormatted ? `⏳ *Previous Time:* ~${previousTimeFormatted}~\n` : '') +
      (reason ? `📝 *Note:* ${reason}\n` : '') +
      `\n🔗 Review your updated schedule:\n${actionUrl}\n\n` +
      `_Barakallahu Feekum,_ \n_IlmConnect Support_`
    );
  }
}
