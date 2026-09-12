import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailNotificationService } from './email-notification.service';
import { WhatsAppNotificationService } from './whatsapp-notification.service';
import { Subject, Observable, interval, merge } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface LiveNotificationEvent {
  userId: string;
  data: {
    id: string;
    type: string;
    payloadJson: any;
    channel: string;
    createdAt: string;
    readAt: string | null;
  };
}

export interface DispatchBookingNotificationParams {
  eventType: 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED' | 'BOOKING_RESCHEDULED' | 'SESSION_STUDENT_NO_SHOW';
  sessionId: string;
  actor: {
    id: string;
    name: string;
    role: string;
  };
  recipient: {
    id: string;
    name: string;
    role: string;
    email: string;
    phone?: string | null;
  };
  sessionDate: Date;
  sessionTimeFormatted: string;
  previousTimeFormatted?: string;
  subjectTopic?: string;
  reason?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  // In-memory RxJS subject for live SSE event streaming
  private readonly notificationEvents$ = new Subject<LiveNotificationEvent>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailNotificationService,
    private readonly whatsAppService: WhatsAppNotificationService,
  ) {}

  /**
   * SSE Stream for real-time notifications to connected clients
   */
  getNotificationStream(userId: string): Observable<{ data: any }> {
    const pings$ = interval(25000).pipe(
      map(() => ({ data: { type: 'HEARTBEAT', timestamp: new Date().toISOString() } })),
    );

    const userEvents$ = this.notificationEvents$.pipe(
      filter((event) => event.userId === userId),
      map((event) => ({ data: event.data })),
    );

    return merge(userEvents$, pings$);
  }

  async getMyNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId, channel: 'IN_APP' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) throw new NotFoundException('Notification not found');

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async createNotification(userId: string, type: string, payload: any, channel: string = 'IN_APP') {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        payloadJson: payload,
        channel,
      },
    });

    // Push live event via SSE
    this.notificationEvents$.next({
      userId,
      data: {
        id: notification.id,
        type: notification.type,
        payloadJson: notification.payloadJson,
        channel: notification.channel,
        createdAt: notification.createdAt.toISOString(),
        readAt: null,
      },
    });

    return notification;
  }

  /** Count unread notifications for a user */
  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { userId, readAt: null, channel: 'IN_APP' },
    });
    return { count };
  }

  /** Mark all notifications as read for a user */
  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null, channel: 'IN_APP' },
      data: { readAt: new Date() },
    });
  }

  /**
   * Unified Booking, Cancellation, and Rescheduling Notification Dispatcher.
   * Handles:
   * 1. In-System Live Pop-Up Notification (Database + SSE Real-time stream)
   * 2. Email Notification (Formatted HTML & Plain Text)
   * 3. WhatsApp Notification (Formatted E.164 message)
   */
  async dispatchBookingNotification(params: DispatchBookingNotificationParams): Promise<void> {
    const {
      eventType,
      sessionId,
      actor,
      recipient,
      sessionDate,
      sessionTimeFormatted,
      previousTimeFormatted,
      subjectTopic = 'Quran Lesson',
      reason,
    } = params;

    const sessionDateFormatted = sessionDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    let title = '';
    let message = '';
    if (eventType === 'BOOKING_CONFIRMED') {
      title = 'New Session Booked';
      message = `${actor.name} has scheduled a session with you on ${sessionDateFormatted} at ${sessionTimeFormatted}.`;
    } else if (eventType === 'BOOKING_CANCELLED') {
      title = 'Session Cancelled';
      message = `${actor.name} has cancelled the session scheduled for ${sessionDateFormatted} at ${sessionTimeFormatted}.${reason ? ` Reason: ${reason}` : ''}`;
    } else if (eventType === 'BOOKING_RESCHEDULED') {
      title = 'Session Rescheduled';
      message = `${actor.name} has rescheduled the session to ${sessionDateFormatted} at ${sessionTimeFormatted}.${previousTimeFormatted ? ` (Previously: ${previousTimeFormatted})` : ''}`;
    } else if (eventType === 'SESSION_STUDENT_NO_SHOW') {
      title = 'Class Attendance: Marked Absent';
      message = `You were marked absent by ${actor.name} for the scheduled session on ${sessionDateFormatted} at ${sessionTimeFormatted}.${reason ? ` Note: ${reason}` : ''}`;
    }

    this.logger.log(
      `[DispatchNotification] ${eventType} from ${actor.name} (${actor.role}) to ${recipient.name} (${recipient.role})`
    );

    // 1. In-System Live Notification (stored in DB and pushed immediately via SSE)
    try {
      await this.createNotification(
        recipient.id,
        eventType,
        {
          sessionId,
          title,
          message,
          actorId: actor.id,
          actorName: actor.name,
          actorRole: actor.role,
          recipientName: recipient.name,
          sessionDate: sessionDate.toISOString(),
          sessionDateFormatted,
          sessionTimeFormatted,
          previousTimeFormatted,
          reason,
          subjectTopic,
        },
        'IN_APP',
      );
    } catch (e: any) {
      this.logger.error(`Failed to create in-app notification: ${e.message}`);
    }

    const actionUrl = recipient.role.toUpperCase() === 'LECTURER'
      ? 'http://localhost:3000/lecturer/sessions'
      : 'http://localhost:3000/student/dashboard';

    // 2. Email Notification Dispatch
    if (recipient.email) {
      try {
        const { subject, htmlContent, textContent } = this.emailService.buildBookingEmail({
          eventType,
          recipientName: recipient.name,
          actorName: actor.name,
          actorRole: actor.role,
          subjectTopic,
          sessionDateFormatted,
          sessionTimeFormatted,
          previousTimeFormatted,
          reason,
          actionUrl,
        });

        await this.emailService.sendEmail({
          toEmail: recipient.email,
          recipientName: recipient.name,
          recipientRole: recipient.role,
          subject,
          htmlContent,
          textContent,
          eventType,
          metadata: { userId: recipient.id, sessionId },
        });
      } catch (err: any) {
        this.logger.error(`Failed to dispatch email: ${err.message}`);
      }
    }

    // 3. WhatsApp Notification Dispatch
    const recipientPhone = recipient.phone || '+94770000000'; // Default fallback if lecturer phone pending
    try {
      const whatsAppText = this.whatsAppService.buildBookingMessage({
        eventType,
        recipientName: recipient.name,
        actorName: actor.name,
        actorRole: actor.role,
        subjectTopic,
        sessionDateFormatted,
        sessionTimeFormatted,
        previousTimeFormatted,
        reason,
        actionUrl,
      });

      await this.whatsAppService.sendWhatsApp({
        toPhone: recipientPhone,
        recipientName: recipient.name,
        recipientRole: recipient.role,
        eventType,
        message: whatsAppText,
        metadata: { userId: recipient.id, sessionId },
      });
    } catch (err: any) {
      this.logger.error(`Failed to dispatch WhatsApp: ${err.message}`);
    }
  }
}
