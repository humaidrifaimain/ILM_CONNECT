import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/booking.dto';
import { SessionStatus, SlotStatus, Role } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';
import { publicLecturerSelect } from '../profile/profile.service';
import { Prisma } from '@prisma/client';
import { lecturerConflictWindow, SESSION_MINUTES } from '../availability/session-timing';

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
    if (!Number.isFinite(startsAt.getTime())) throw new BadRequestException('Choose a valid session date');
    const endsAt = new Date(startsAt.getTime() + SESSION_MINUTES * 60 * 1000);
    const session = await this.prisma.$transaction(async tx => {
    for (const key of [`lecturer:${lecturerId}`, `student:${studentId}`].sort()) {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))::text`;
    }
    if (isStudent || isLecturer) {
      const studentProfile = await tx.studentProfile.findUnique({
        where: { userId: studentId },
        select: { assignedLecturerId: true },
      });

      if (!studentProfile?.assignedLecturerId) {
        throw new BadRequestException('Lecturer is not assigned yet. Please contact support.');
      }

      if (studentProfile.assignedLecturerId !== lecturerId) {
        throw new ForbiddenException('You can only book sessions for the assigned lecturer and student');
      }
    }

    // Enforce booking time limits (cannot book less than 12 hours in advance)
    const now = new Date();
    const twelveHoursFromNow = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    if (startsAt < twelveHoursFromNow) {
      throw new BadRequestException('Sessions cannot be booked less than 12 hours in advance');
    }

    // Check student subscription status
    const subscription = await tx.subscription.findFirst({
      where: {
        studentId,
        status: 'ACTIVE',
        currentPeriodStart: { lte: now },
        currentPeriodEnd: { gt: now },
      },
      orderBy: { currentPeriodEnd: 'desc' },
    });
    if (!subscription) {
      throw new BadRequestException('Student does not have an active subscription');
    }
    if (startsAt < subscription.currentPeriodStart || endsAt > subscription.currentPeriodEnd) {
      throw new BadRequestException('Choose a session within your active subscription period');
    }

    // Check student weekly/daily allowance
    await this.validateBookingAllowance(studentId, startsAt, subscription.tier, tx);

    // Check if student already has an overlapping session
    const studentOverlap = await tx.session.findFirst({
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
    const slot = await tx.availabilitySlot.findFirst({
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

    // The lecturer lock also serializes bookings in the surrounding break window.
    const overlappingSession = await tx.session.findFirst({
      where: {
        lecturerId,
        status: { in: [SessionStatus.SCHEDULED, SessionStatus.IN_PROGRESS] },
        ...lecturerConflictWindow(startsAt, endsAt),
      },
    });

    if (overlappingSession) {
      throw new BadRequestException('Leave at least 10 minutes before and after the lecturer’s other sessions');
    }

    // Create session ID first so we can build the LiveKit room name
    const sessionId = require('crypto').randomUUID();
    const livekitRoomName = `ilm-session-${sessionId}`;

    // Book slot and session
    const session = await tx.session.create({
        data: {
          id: sessionId,
          studentId,
          lecturerId,
          startsAt,
          endsAt,
          status: SessionStatus.SCHEDULED,
          livekitRoomName,
        },
      });
    const claimed = await tx.availabilitySlot.updateMany({
        where: { id: slot.id, status: SlotStatus.OPEN },
        data: { status: SlotStatus.BOOKED },
      });
    if (claimed.count !== 1) throw new BadRequestException('This slot has just been booked. Choose another time');
    return session;
    }, { maxWait: 10000, timeout: 30000 });

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

      if (isLecturer || isStudent) {
        await this.notificationService.dispatchBookingNotification({
          eventType: 'BOOKING_CONFIRMED',
          sessionId: session.id,
          actor: {
            id: isLecturer ? lecturerId : studentId,
            name: isLecturer ? lecturerName : studentName,
            role: isLecturer ? 'LECTURER' : 'STUDENT',
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
      }
      if (!isLecturer) {
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
      }
    } catch (notifErr: any) {
      this.logger.error(`Error dispatching booking notifications: ${notifErr.message}`);
    }

    return session;
  }

  async validateBookingAllowance(studentId: string, bookingDate: Date, tier: string, db: Prisma.TransactionClient | PrismaService = this.prisma, excludeSessionId?: string) {
    // Determine limits based on tier
    const isPremium = /PREMIUM|FAST[\s_-]*TRACK/i.test(tier || '');
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
    const existingSessions = await db.session.findMany({
      where: {
        studentId,
        ...(excludeSessionId ? { id: { not: excludeSessionId } } : {}),
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
      throw new BadRequestException(`Maximum weekly session allowance reached (${weeklyLimit} sessions per week for ${isPremium ? 'Fast Track' : 'Standard'} plan)`);
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
        lecturer: { select: publicLecturerSelect },
        lesson: { include: { module: { include: { learningPath: true } } } },
        notes: { select: { id: true, sessionId: true, lecturerId: true, topicsCovered: true, homework: true, studentProgressRating: true, sharedNotes: true } },
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

  async updateBooking(id: string, data: { notes?: string; status?: string }, user: { id: string; role: Role }) {
    const session = await this.prisma.session.findUnique({ where: { id }, include: { notes: true } });
    if (!session) throw new NotFoundException('Session not found');
    if (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN && session.lecturerId !== user.id) throw new ForbiddenException('This session is not assigned to you');
    if (data.notes !== undefined && (typeof data.notes !== 'string' || data.notes.length > 10000)) throw new BadRequestException('Invalid session notes');
    const cleanNotes = data.notes?.trim();
    if ((data.status === SessionStatus.COMPLETED || (session.status === SessionStatus.COMPLETED && data.notes !== undefined)) && (!cleanNotes || cleanNotes.length < 30)) {
      throw new BadRequestException('Write at least 30 characters of lesson feedback before completing the session');
    }
    if (data.status && data.status !== SessionStatus.COMPLETED) throw new BadRequestException('Use the cancellation, rescheduling, or attendance action to change session status');
    if (data.status === SessionStatus.COMPLETED && (session.startsAt > new Date() || ![SessionStatus.SCHEDULED, SessionStatus.IN_PROGRESS, SessionStatus.COMPLETED].includes(session.status as any))) throw new BadRequestException('Only a started active session can be completed');

    const result = await this.prisma.$transaction(async tx => {
      for (const key of [`lecturer:${session.lecturerId}`, `student:${session.studentId}`].sort()) {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))::text`;
      }
      const current = await tx.session.findUnique({ where: { id }, include: { notes: true } });
      if (!current) throw new NotFoundException('Session not found');
      if (data.status === SessionStatus.COMPLETED && ![SessionStatus.SCHEDULED, SessionStatus.IN_PROGRESS, SessionStatus.COMPLETED].includes(current.status as any)) throw new BadRequestException('This session is no longer active');
      if (current.status === SessionStatus.COMPLETED && data.notes !== undefined && (!cleanNotes || cleanNotes.length < 30)) throw new BadRequestException('Write at least 30 characters of lesson feedback');
      if (data.status === SessionStatus.COMPLETED && current.status !== SessionStatus.COMPLETED) {
        const changed = await tx.session.updateMany({ where: { id, status: { in: [SessionStatus.SCHEDULED, SessionStatus.IN_PROGRESS] }, startsAt: { lte: new Date() } }, data: { status: SessionStatus.COMPLETED } });
        if (changed.count !== 1) {
          const current = await tx.session.findUnique({ where: { id } });
          if (current?.status !== SessionStatus.COMPLETED) throw new BadRequestException('This session is no longer active');
        }
      }
    const updated = await tx.session.update({
      where: { id },
      data: {
        notes: data.notes !== undefined ? {
          upsert: {
            create: { lecturerId: session.lecturerId, topicsCovered: '', homework: '', studentProgressRating: 0, internalNotes: '', sharedNotes: cleanNotes! },
            update: { sharedNotes: cleanNotes }
          }
        } : undefined,
      },
    });
    return { updated, shouldNotify: !!cleanNotes && cleanNotes.length >= 30 && (data.status === SessionStatus.COMPLETED || current.status === SessionStatus.COMPLETED) && (current.status !== SessionStatus.COMPLETED || (current.notes?.sharedNotes.trim().length || 0) < 30) };
    });
    if (result.shouldNotify) {
      try { await this.notificationService.dispatchLessonFeedback(id, cleanNotes!); }
      catch (error) { this.logger.error(`Lesson feedback notification failed for ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`); }
    }
    return result.updated;
  }

  async getPendingLessonNotes(lecturerId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { lecturerId, status: { in: [SessionStatus.COMPLETED, SessionStatus.IN_PROGRESS] } },
      select: { id: true, startsAt: true, status: true, student: { select: { fullName: true } }, notes: { select: { sharedNotes: true } } },
      orderBy: { startsAt: 'asc' },
    });
    return sessions.filter(session => session.status === SessionStatus.IN_PROGRESS || (session.notes?.sharedNotes.trim().length || 0) < 30);
  }

  async markStudentAbsent(
    user: { id: string; role?: Role },
    sessionId: string,
    reason?: string,
    absentRole: 'student' | 'lecturer' = 'student',
    options?: { onlyIfNeverJoined: boolean; closeMeeting: () => Promise<void> },
  ) {
    if (!['student', 'lecturer'].includes(absentRole)) throw new BadRequestException('Choose student or lecturer absence');
    if (reason !== undefined && (typeof reason !== 'string' || reason.length > 1000)) throw new BadRequestException('Attendance reason must be text up to 1,000 characters');
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
    if (absentRole === 'lecturer' && !isAdmin) throw new ForbiddenException('Only administrators can record lecturer absence');
    if (session.startsAt > new Date()) throw new BadRequestException('Attendance can only be recorded after the session starts');

    if (session.status === SessionStatus.COMPLETED) {
      throw new BadRequestException('Cannot mark an already completed session as absent.');
    }

    if (session.status === SessionStatus.CANCELED) {
      throw new BadRequestException('Cannot mark a canceled session as absent.');
    }

    if (session.status === SessionStatus.NO_SHOW_STUDENT || session.status === SessionStatus.NO_SHOW_LECTURER) {
      throw new BadRequestException('Attendance has already been recorded');
    }

    const noteReason = reason?.trim() || `${absentRole === 'student' ? 'Student' : 'Lecturer'} did not attend the scheduled session.`;
    const status = absentRole === 'lecturer' ? SessionStatus.NO_SHOW_LECTURER : SessionStatus.NO_SHOW_STUDENT;
    const eventType = absentRole === 'lecturer' ? 'SESSION_LECTURER_NO_SHOW' : 'SESSION_STUDENT_NO_SHOW';

    const updatedSession = await this.prisma.$transaction(async tx => {
      if (options?.onlyIfNeverJoined) {
        for (const key of [`lecturer:${session.lecturerId}`, `student:${session.studentId}`].sort()) await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))::text`;
        const current = await tx.session.findUniqueOrThrow({ where: { id: sessionId } });
        const waitStartedAt = current.meetingStartedAt ? Math.max(+current.startsAt, +current.meetingStartedAt) : null;
        if (current.studentJoinedAt || waitStartedAt === null || Date.now() < waitStartedAt + 15 * 60_000 || (current.attendancePromptAfter && new Date() < current.attendancePromptAfter)) throw new BadRequestException('Student attendance changed or the waiting period has not ended');
      }
      const claimed = await tx.session.updateMany({ where: { id: sessionId, status: { in: [SessionStatus.SCHEDULED, SessionStatus.IN_PROGRESS] }, ...(options?.onlyIfNeverJoined ? { studentJoinedAt: null } : {}) }, data: { status } });
      if (claimed.count !== 1) throw new BadRequestException('Attendance has already been recorded or the session is no longer active');
      if (options) await options.closeMeeting();
      const updated = await tx.session.update({
        where: { id: sessionId },
        data: {
          status,
          notes: {
            upsert: {
              create: {
                lecturerId: session.lecturerId,
                topicsCovered: absentRole === 'student' ? 'Session conducted · Student was absent' : 'Session not conducted · Lecturer was absent',
                homework: '',
                studentProgressRating: 0,
                internalNotes: noteReason,
                sharedNotes: noteReason,
              },
              update: {
                sharedNotes: noteReason,
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

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: eventType,
          entity: 'SESSION',
          entityId: sessionId,
          details: {
            markedBy: user.id,
            reason: noteReason,
            absentRole,
            studentId: session.studentId,
          },
        },
      });
      return updated;
    }, options ? { maxWait: 10_000, timeout: 15_000 } : undefined);

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
        eventType,
        sessionId,
        actor: {
          id: user.id,
          name: isAdmin ? 'Administrator' : lecturerName,
          role: user.role || Role.LECTURER,
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
        reason: noteReason,
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
    if ([SessionStatus.COMPLETED, SessionStatus.NO_SHOW_LECTURER].includes(session.status as any)) throw new BadRequestException('This session has already concluded and cannot be rescheduled');
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
    if (typeof newStartsAtISO !== 'string' || !Number.isFinite(newStartsAt.getTime())) throw new BadRequestException('Choose a valid reschedule date');
    const newEndsAt = new Date(newStartsAt.getTime() + SESSION_MINUTES * 60 * 1000);

    if (newStartsAt <= new Date()) {
      throw new BadRequestException('Cannot reschedule to a past time');
    }
    if (isStudent && !isAdmin && +newStartsAt < +now + 12 * 60 * 60 * 1000) throw new BadRequestException('Choose a new time at least 12 hours from now');

    const oldStartsAt = session.startsAt;
    const updated = await this.prisma.$transaction(async tx => {
    for (const key of [`lecturer:${session.lecturerId}`, `student:${session.studentId}`].sort()) await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))::text`;
    const current = await tx.session.findUniqueOrThrow({ where: { id: sessionId } });
    if (current.status !== session.status || +current.startsAt !== +session.startsAt) throw new BadRequestException('The session has changed. Refresh and try again');
    const subscription = await tx.subscription.findFirst({ where: {
      studentId: session.studentId, status: 'ACTIVE', currentPeriodStart: { lte: now }, currentPeriodEnd: { gt: now },
    }, orderBy: { currentPeriodEnd: 'desc' } });
    if (!subscription || newStartsAt < subscription.currentPeriodStart || newEndsAt > subscription.currentPeriodEnd) throw new BadRequestException('Choose a session within your active subscription period');
    await this.validateBookingAllowance(session.studentId, newStartsAt, subscription.tier, tx, sessionId);
    const overlap = await tx.session.findFirst({ where: {
      id: { not: sessionId }, status: { in: [SessionStatus.SCHEDULED, SessionStatus.IN_PROGRESS] },
      OR: [
        { lecturerId: session.lecturerId, ...lecturerConflictWindow(newStartsAt, newEndsAt) },
        { studentId: session.studentId, startsAt: { lt: newEndsAt }, endsAt: { gt: newStartsAt } },
      ],
    } });
    if (overlap) throw new BadRequestException('Choose a free time with at least a 10-minute lecturer break between sessions');
    const newSlot = await tx.availabilitySlot.findFirst({
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
    const oldSlot = await tx.availabilitySlot.findFirst({
      where: {
        lecturerId: session.lecturerId,
        startsAt: session.startsAt,
      },
    });

    if (oldSlot) {
      await tx.availabilitySlot.update({
        where: { id: oldSlot.id },
        data: { status: SlotStatus.OPEN },
      });
    }

    const claimed = await tx.availabilitySlot.updateMany({
      where: { id: newSlot.id, status: SlotStatus.OPEN },
      data: { status: SlotStatus.BOOKED },
    });
    if (claimed.count !== 1) throw new BadRequestException('This slot has just been booked. Choose another time');
    return tx.session.update({
      where: { id: sessionId },
      data: {
        startsAt: newStartsAt,
        endsAt: newEndsAt,
        meetingStartedAt: null,
        rescheduledAt: new Date(),
        status: SessionStatus.SCHEDULED,
      },
      include: { lecturer: { select: publicLecturerSelect }, student: true },
    });
    }, { maxWait: 10000, timeout: 15000 });

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
          previousStartsAt: oldStartsAt,
          reason,
        });
      }

      if (isLecturer || isAdmin || isStudent) {
        await this.notificationService.dispatchBookingNotification({
          eventType: 'BOOKING_RESCHEDULED',
          sessionId,
          actor: {
            id: user.id,
            name: isStudent ? studentName : lecturerName,
            role: isStudent ? 'STUDENT' : 'LECTURER',
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
          previousStartsAt: oldStartsAt,
          reason,
        });
      }
    } catch (notifErr: any) {
      this.logger.error(`Failed to dispatch reschedule notifications: ${notifErr.message}`);
    }

    return updated;
  }
}
