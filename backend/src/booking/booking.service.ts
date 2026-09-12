import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/booking.dto';
import { SessionStatus, SlotStatus, Role } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async createBooking(caller: string | { id: string; role?: Role }, dto: CreateBookingDto) {
    const userRole = typeof caller === 'object' ? caller.role : Role.STUDENT;
    const callerId = typeof caller === 'object' ? caller.id : caller;

    const isLecturer = userRole === Role.LECTURER;
    const isStudent = userRole === Role.STUDENT;

    const studentId = isStudent ? callerId : (dto.studentId || callerId);
    const lecturerId = isLecturer ? callerId : (dto.lecturerId || callerId);

    if (!studentId) {
      throw new BadRequestException('Student ID is required to book a session');
    }
    if (!lecturerId) {
      throw new BadRequestException('Lecturer ID is required to book a session');
    }

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(startsAt.getTime() + 40 * 60 * 1000); // 40 minutes session

    // Enforce booking time limits (cannot book less than 12 hours in advance)
    const now = new Date();
    const twelveHoursFromNow = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    if (startsAt < twelveHoursFromNow) {
      throw new BadRequestException('Sessions cannot be booked less than 12 hours in advance');
    }

    // Check student subscription status
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        studentId,
        status: 'ACTIVE',
      },
    });
    if (!subscription) {
      throw new BadRequestException('Student does not have an active subscription');
    }

    // Check student weekly/daily allowance
    await this.validateBookingAllowance(studentId, startsAt, subscription.tier);

    // Check if student already has an overlapping session
    const studentOverlap = await this.prisma.session.findFirst({
      where: {
        studentId,
        status: { in: [SessionStatus.SCHEDULED, SessionStatus.IN_PROGRESS] },
        OR: [
          {
            startsAt: { lte: startsAt },
            endsAt: { gt: startsAt },
          },
          {
            startsAt: { lt: endsAt },
            endsAt: { gte: endsAt },
          },
        ],
      },
    });

    if (studentOverlap) {
      throw new BadRequestException('You already have a scheduled session at this time');
    }

    // Find and check availability slot
    const slot = await this.prisma.availabilitySlot.findFirst({
      where: {
        lecturerId,
        startsAt: { lte: startsAt },
        endsAt: { gte: endsAt },
        status: SlotStatus.OPEN,
      },
    });

    if (!slot) {
      throw new BadRequestException('Lecturer is not available at the requested time');
    }

    // Check if lecturer has any overlapping session
    const overlappingSession = await this.prisma.session.findFirst({
      where: {
        lecturerId,
        status: { in: [SessionStatus.SCHEDULED, SessionStatus.IN_PROGRESS] },
        OR: [
          {
            startsAt: { lte: startsAt },
            endsAt: { gt: startsAt },
          },
          {
            startsAt: { lt: endsAt },
            endsAt: { gte: endsAt },
          },
        ],
      },
    });

    if (overlappingSession) {
      throw new BadRequestException('Lecturer already has a scheduled session at this time');
    }

    // Create session ID first so we can build the LiveKit room name
    const sessionId = require('crypto').randomUUID();
    const livekitRoomName = `ilm-session-${sessionId}`;

    // Book slot and session
    const [session] = await this.prisma.$transaction([
      this.prisma.session.create({
        data: {
          id: sessionId,
          studentId,
          lecturerId,
          startsAt,
          endsAt,
          status: SessionStatus.SCHEDULED,
          livekitRoomName,
        },
      }),
      this.prisma.availabilitySlot.update({
        where: { id: slot.id },
        data: { status: SlotStatus.BOOKED },
      }),
    ]);

    // Create Audit Log
    await this.prisma.auditLog.create({
      data: {
        actorId: callerId,
        action: 'SESSION_BOOKED',
        entity: 'SESSION',
        entityId: session.id,
        details: { ip: '127.0.0.1', userAgent: 'ilmconnect-client', bookedByRole: userRole },
      },
    });

    // Notify counterpart (and booker) across Live In-App Pop-up, Email, and WhatsApp
    try {
      const [studentUser, lecturerUser] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: studentId },
          include: { studentProfile: true },
        }),
        this.prisma.user.findUnique({
          where: { id: lecturerId },
          include: { lecturerProfile: true },
        }),
      ]);

      const studentName = studentUser?.studentProfile?.fullName || 'Student';
      const lecturerName = lecturerUser?.lecturerProfile?.fullName || 'Lecturer';
      const studentEmail = studentUser?.email || '';
      const studentPhone = studentUser?.studentProfile?.phone || null;
      const lecturerEmail = lecturerUser?.email || '';

      const sessionTimeFormatted = startsAt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

      if (isLecturer) {
        // Lecturer booked session -> Student is the recipient!
        await this.notificationService.dispatchBookingNotification({
          eventType: 'BOOKING_CONFIRMED',
          sessionId: session.id,
          actor: {
            id: lecturerId,
            name: lecturerName,
            role: 'LECTURER',
          },
          recipient: {
            id: studentId,
            name: studentName,
            role: 'STUDENT',
            email: studentEmail,
            phone: studentPhone,
          },
          sessionDate: startsAt,
          sessionTimeFormatted,
        });

        // In-app confirmation for Lecturer
        await this.notificationService.createNotification(
          lecturerId,
          'BOOKING_CONFIRMED',
          {
            sessionId: session.id,
            title: 'Session Scheduled',
            message: `You scheduled a session with ${studentName} for ${startsAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${sessionTimeFormatted}.`,
            actorId: lecturerId,
            actorName: lecturerName,
            actorRole: 'LECTURER',
            sessionDate: startsAt.toISOString(),
          },
          'IN_APP',
        );
      } else {
        // Student booked session -> Lecturer is the recipient!
        if (lecturerUser) {
          await this.notificationService.dispatchBookingNotification({
            eventType: 'BOOKING_CONFIRMED',
            sessionId: session.id,
            actor: {
              id: studentId,
              name: studentName,
              role: 'STUDENT',
            },
            recipient: {
              id: lecturerId,
              name: lecturerName,
              role: 'LECTURER',
              email: lecturerEmail,
              phone: null,
            },
            sessionDate: startsAt,
            sessionTimeFormatted,
          });
        }

        // Also notify Student across In-App, Email, and WhatsApp
        if (studentUser) {
          await this.notificationService.createNotification(
            studentId,
            'BOOKING_CONFIRMED',
            {
              sessionId: session.id,
              title: 'Session Confirmed',
              message: `Your session with ${lecturerName} has been booked for ${startsAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${sessionTimeFormatted}.`,
              actorId: studentId,
              actorName: studentName,
              actorRole: 'STUDENT',
              sessionDate: startsAt.toISOString(),
            },
            'IN_APP',
          );
        }
      }
    } catch (notifErr: any) {
      this.logger.error(`Error dispatching booking notifications: ${notifErr.message}`);
    }

    return session;
  }

  async validateBookingAllowance(studentId: string, bookingDate: Date, tier: string) {
    // Determine limits based on tier
    const isPremium = tier && tier.toUpperCase().includes('PREMIUM');
    const weeklyLimit = isPremium ? 3 : 2;
    const dailyLimit = 1;

    // Determine start and end of week (Monday to Sunday)
    const day = bookingDate.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day; // Adjust to Monday
    
    const startOfWeek = new Date(bookingDate);
    startOfWeek.setDate(bookingDate.getDate() + diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const startOfDay = new Date(bookingDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(bookingDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch existing sessions in this week
    const existingSessions = await this.prisma.session.findMany({
      where: {
        studentId,
        status: {
          in: [
            SessionStatus.SCHEDULED,
            SessionStatus.IN_PROGRESS,
            SessionStatus.COMPLETED,
          ],
        },
        startsAt: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
    });

    const bookedThisWeek = existingSessions.length;
    const bookedThisDay = existingSessions.filter(
      s => s.startsAt >= startOfDay && s.startsAt <= endOfDay
    ).length;

    if (bookedThisWeek >= weeklyLimit) {
      throw new BadRequestException(`Maximum weekly session allowance reached (${weeklyLimit} sessions per week for ${isPremium ? 'Premium' : 'Standard'} plan)`);
    }

    if (bookedThisDay >= dailyLimit) {
      throw new BadRequestException(`Maximum daily session allowance reached (${dailyLimit} session per day)`);
    }
  }

  async cancelBooking(user: { id: string; role?: Role }, sessionId: string, reason?: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        student: { include: { user: true } },
        lecturer: { include: { user: true } },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
    const isStudent = session.studentId === user.id;
    const isLecturer = session.lecturerId === user.id;

    if (!isAdmin && !isStudent && !isLecturer) {
      throw new ForbiddenException(
        'You are not authorized to cancel this session.'
      );
    }

    if (session.status !== SessionStatus.SCHEDULED) {
      throw new BadRequestException('Only scheduled sessions can be canceled');
    }

    const now = new Date();

    // Cancellation policy:
    // Student: only allowed >= 12 hours before start time
    if (isStudent && !isAdmin) {
      const twelveHoursBefore = new Date(session.startsAt.getTime() - 12 * 60 * 60 * 1000);
      if (now > twelveHoursBefore) {
        throw new BadRequestException(
          'Sessions cannot be canceled less than 12 hours before start time. Please contact Support for emergency assistance.',
        );
      }
    }

    // Lecturer: only allowed >= 6 hours before start time
    if (isLecturer && !isAdmin) {
      const sixHoursBefore = new Date(session.startsAt.getTime() - 6 * 60 * 60 * 1000);
      if (now > sixHoursBefore) {
        throw new BadRequestException(
          'Lecturers cannot cancel sessions less than 6 hours before start time. Please contact Support for emergency assistance.',
        );
      }
    }

    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // If lecturer cancels, student should never be penalized (always CANCELED).
    // If student cancels within 24h, counts as NO_SHOW_STUDENT.
    const updateStatus = (isStudent && session.startsAt < twentyFourHoursFromNow)
      ? SessionStatus.NO_SHOW_STUDENT
      : SessionStatus.CANCELED;

    if (updateStatus === SessionStatus.CANCELED) {
      const slot = await this.prisma.availabilitySlot.findFirst({
        where: {
          lecturerId: session.lecturerId,
          startsAt: session.startsAt,
        },
      });

      if (slot) {
        await this.prisma.availabilitySlot.update({
          where: { id: slot.id },
          data: { status: SlotStatus.OPEN },
        });
      }
    }

    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: { status: updateStatus },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action:
          updateStatus === SessionStatus.NO_SHOW_STUDENT
            ? 'SESSION_STUDENT_NO_SHOW'
            : 'SESSION_CANCELED',
        entity: 'SESSION',
        entityId: sessionId,
        details: { ip: '127.0.0.1', userAgent: 'ilmconnect-client', reason, status: updateStatus },
      },
    });

    // Notify the other party (Student <-> Lecturer)
    try {
      const studentName = session.student?.fullName || 'Student';
      const lecturerName = session.lecturer?.fullName || 'Lecturer';
      const studentEmail = session.student?.user?.email || '';
      const studentPhone = session.student?.phone || null;
      const lecturerEmail = session.lecturer?.user?.email || '';

      const sessionTimeFormatted = session.startsAt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

      // If Student cancelled -> Lecturer is recipient
      if (isStudent || isAdmin) {
        await this.notificationService.dispatchBookingNotification({
          eventType: 'BOOKING_CANCELLED',
          sessionId,
          actor: {
            id: user.id,
            name: studentName,
            role: 'STUDENT',
          },
          recipient: {
            id: session.lecturerId,
            name: lecturerName,
            role: 'LECTURER',
            email: lecturerEmail,
            phone: null,
          },
          sessionDate: session.startsAt,
          sessionTimeFormatted,
          reason,
        });
      }

      // If Lecturer cancelled -> Student is recipient
      if (isLecturer || isAdmin) {
        await this.notificationService.dispatchBookingNotification({
          eventType: 'BOOKING_CANCELLED',
          sessionId,
          actor: {
            id: user.id,
            name: lecturerName,
            role: 'LECTURER',
          },
          recipient: {
            id: session.studentId,
            name: studentName,
            role: 'STUDENT',
            email: studentEmail,
            phone: studentPhone,
          },
          sessionDate: session.startsAt,
          sessionTimeFormatted,
          reason,
        });
      }
    } catch (notifErr: any) {
      this.logger.error(`Failed to dispatch cancellation notifications: ${notifErr.message}`);
    }

    return updatedSession;
  }

  async getStudentBookings(studentId: string) {
    // Automatically transition past scheduled sessions to NO_SHOW_STUDENT if endsAt has passed
    const now = new Date();
    await this.prisma.session.updateMany({
      where: {
        studentId,
        status: SessionStatus.SCHEDULED,
        endsAt: { lt: now },
      },
      data: { status: SessionStatus.NO_SHOW_STUDENT },
    });

    return this.prisma.session.findMany({
      where: { studentId },
      include: {
        lecturer: true,
        lesson: { include: { module: { include: { learningPath: true } } } },
        notes: true,
        rating: true,
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  async getLecturerBookings(lecturerId: string) {
    // Automatically transition past scheduled sessions to NO_SHOW_STUDENT if endsAt has passed
    const now = new Date();
    await this.prisma.session.updateMany({
      where: {
        lecturerId,
        status: SessionStatus.SCHEDULED,
        endsAt: { lt: now },
      },
      data: { status: SessionStatus.NO_SHOW_STUDENT },
    });

    return this.prisma.session.findMany({
      where: { lecturerId },
      include: {
        student: true,
        lesson: { include: { module: { include: { learningPath: true } } } },
        notes: true,
        rating: true,
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  async updateBooking(id: string, data: { notes?: string; status?: string }) {
    const session = await this.prisma.session.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');

    return this.prisma.session.update({
      where: { id },
      data: {
        notes: data.notes !== undefined ? {
          upsert: {
            create: { lecturerId: session.lecturerId, topicsCovered: '', homework: '', studentProgressRating: 0, internalNotes: '', sharedNotes: data.notes },
            update: { sharedNotes: data.notes }
          }
        } : undefined,
        status: data.status ? (data.status as any) : undefined,
      },
    });
  }

  async markStudentAbsent(
    user: { id: string; role?: Role },
    sessionId: string,
    reason?: string,
  ) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        student: { include: { user: true } },
        lecturer: { include: { user: true } },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
    const isLecturer = session.lecturerId === user.id;

    if (!isAdmin && !isLecturer) {
      throw new ForbiddenException(
        'Only the assigned lecturer or an administrator can mark attendance.'
      );
    }

    if (session.status === SessionStatus.COMPLETED) {
      throw new BadRequestException('Cannot mark an already completed session as absent.');
    }

    if (session.status === SessionStatus.CANCELED) {
      throw new BadRequestException('Cannot mark a canceled session as absent.');
    }

    if (session.status === SessionStatus.NO_SHOW_STUDENT) {
      throw new BadRequestException('This session has already been marked as student absent.');
    }

    const noteReason = reason?.trim() || 'Student did not attend scheduled session.';

    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.NO_SHOW_STUDENT,
        notes: {
          upsert: {
            create: {
              lecturerId: session.lecturerId,
              topicsCovered: 'Session conducted · Student was absent',
              homework: '',
              studentProgressRating: 0,
              internalNotes: noteReason,
              sharedNotes: `Marked absent by instructor: ${noteReason}`,
            },
            update: {
              sharedNotes: `Marked absent by instructor: ${noteReason}`,
              internalNotes: noteReason,
            },
          },
        },
      },
      include: {
        student: true,
        lecturer: true,
        notes: true,
      },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'SESSION_STUDENT_NO_SHOW',
        entity: 'SESSION',
        entityId: sessionId,
        details: {
          markedBy: user.id,
          reason: reason || 'Lecturer marked student absent',
          studentId: session.studentId,
        },
      },
    });

    // Dispatch notification to student
    try {
      const studentName = session.student?.fullName || session.student?.user?.email?.split('@')[0] || 'Student';
      const lecturerName = session.lecturer?.fullName || 'Your Lecturer';
      const studentEmail = session.student?.user?.email || '';
      const studentPhone = session.student?.phone || null;

      const sessionTimeFormatted = `${session.startsAt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })} – ${session.endsAt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;

      await this.notificationService.dispatchBookingNotification({
        eventType: 'SESSION_STUDENT_NO_SHOW' as any,
        sessionId,
        actor: {
          id: user.id,
          name: lecturerName,
          role: 'LECTURER',
        },
        recipient: {
          id: session.studentId,
          name: studentName,
          role: 'STUDENT',
          email: studentEmail,
          phone: studentPhone,
        },
        sessionDate: session.startsAt,
        sessionTimeFormatted,
        reason: reason || 'Student did not attend the scheduled classroom session.',
      });
    } catch (notifErr: any) {
      this.logger.error(`Failed to dispatch student absent notification: ${notifErr.message}`);
    }

    return updatedSession;
  }

  async rescheduleBooking(
    user: { id: string; role?: Role },
    sessionId: string,
    newStartsAtISO: string,
    reason?: string,
  ) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        student: { include: { user: true } },
        lecturer: { include: { user: true } },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
    const isStudent = session.studentId === user.id;
    const isLecturer = session.lecturerId === user.id;

    if (!isAdmin && !isStudent && !isLecturer) {
      throw new ForbiddenException(
        'You are not authorized to reschedule this session.'
      );
    }

    const now = new Date();
    const startsAtTime = session.startsAt.getTime();
    const endsAtTime = session.endsAt
      ? session.endsAt.getTime()
      : startsAtTime + 40 * 60 * 1000;

    // Student: Allowed only before, and must be >= 12 hours before start
    if (isStudent && !isAdmin) {
      if (session.status !== SessionStatus.SCHEDULED) {
        throw new BadRequestException('Only scheduled sessions can be rescheduled');
      }
      const twelveHoursBefore = new Date(startsAtTime - 12 * 60 * 60 * 1000);
      if (now > twelveHoursBefore) {
        throw new BadRequestException(
          'Students can only reschedule at least 12 hours before class starts. Please contact Support.',
        );
      }
    }

    // Lecturer: Allowed >= 6 hours before start, OR within 6 hours after session end
    if (isLecturer && !isAdmin) {
      if (session.status === SessionStatus.CANCELED) {
        throw new BadRequestException('Canceled sessions cannot be rescheduled');
      }
      const isBeforeAllowed = startsAtTime - now.getTime() >= 6 * 60 * 60 * 1000;
      const isAfterAllowed = now.getTime() >= endsAtTime && (now.getTime() - endsAtTime) <= 6 * 60 * 60 * 1000;

      if (!isBeforeAllowed && !isAfterAllowed) {
        throw new BadRequestException(
          'Lecturers can only reschedule sessions at least 6 hours before start time, or within 6 hours after class concludes. Outside these windows, please contact Support.',
        );
      }
    }

    const newStartsAt = new Date(newStartsAtISO);
    const newEndsAt = new Date(newStartsAt.getTime() + 40 * 60 * 1000); // 40 minutes session

    if (newStartsAt <= new Date()) {
      throw new BadRequestException('Cannot reschedule to a past time');
    }

    // Check availability slot for new time before releasing the old slot.
    const newSlot = await this.prisma.availabilitySlot.findFirst({
      where: {
        lecturerId: session.lecturerId,
        startsAt: { lte: newStartsAt },
        endsAt: { gte: newEndsAt },
        status: SlotStatus.OPEN,
      },
    });

    if (!newSlot) {
      throw new BadRequestException('Lecturer is not available at the requested time');
    }

    // Release old availability slot back to OPEN if it exists
    const oldSlot = await this.prisma.availabilitySlot.findFirst({
      where: {
        lecturerId: session.lecturerId,
        startsAt: session.startsAt,
      },
    });

    if (oldSlot) {
      await this.prisma.availabilitySlot.update({
        where: { id: oldSlot.id },
        data: { status: SlotStatus.OPEN },
      });
    }

    await this.prisma.availabilitySlot.update({
      where: { id: newSlot.id },
      data: { status: SlotStatus.BOOKED },
    });

    const oldStartsAt = session.startsAt;

    // Update the session times
    const updated = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        startsAt: newStartsAt,
        endsAt: newEndsAt,
        status: SessionStatus.SCHEDULED,
      },
      include: { lecturer: true, student: true },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'SESSION_RESCHEDULED',
        entity: 'SESSION',
        entityId: sessionId,
        details: { oldStartsAt, newStartsAt, reason },
      },
    });

    // Notify the other party (Student <-> Lecturer)
    try {
      const studentName = session.student?.fullName || 'Student';
      const lecturerName = session.lecturer?.fullName || 'Lecturer';
      const studentEmail = session.student?.user?.email || '';
      const studentPhone = session.student?.phone || null;
      const lecturerEmail = session.lecturer?.user?.email || '';

      const sessionTimeFormatted = newStartsAt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const previousTimeFormatted = oldStartsAt.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      // If Student rescheduled -> Lecturer is recipient
      if (isStudent || isAdmin) {
        await this.notificationService.dispatchBookingNotification({
          eventType: 'BOOKING_RESCHEDULED',
          sessionId,
          actor: {
            id: user.id,
            name: studentName,
            role: 'STUDENT',
          },
          recipient: {
            id: session.lecturerId,
            name: lecturerName,
            role: 'LECTURER',
            email: lecturerEmail,
            phone: null,
          },
          sessionDate: newStartsAt,
          sessionTimeFormatted,
          previousTimeFormatted,
          reason,
        });
      }

      // If Lecturer rescheduled -> Student is recipient
      if (isLecturer || isAdmin) {
        await this.notificationService.dispatchBookingNotification({
          eventType: 'BOOKING_RESCHEDULED',
          sessionId,
          actor: {
            id: user.id,
            name: lecturerName,
            role: 'LECTURER',
          },
          recipient: {
            id: session.studentId,
            name: studentName,
            role: 'STUDENT',
            email: studentEmail,
            phone: studentPhone,
          },
          sessionDate: newStartsAt,
          sessionTimeFormatted,
          previousTimeFormatted,
          reason,
        });
      }
    } catch (notifErr: any) {
      this.logger.error(`Failed to dispatch reschedule notifications: ${notifErr.message}`);
    }

    return updated;
  }
}
