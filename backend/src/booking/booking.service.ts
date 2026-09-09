import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/booking.dto';
import { SessionStatus, SlotStatus, Role } from '@prisma/client';

@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService) {}

  async createBooking(studentId: string, dto: CreateBookingDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(startsAt.getTime() + 45 * 60 * 1000); // 45 minutes session

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

    // Enforce 3-day gap rule
    await this.validateThreeDayGap(studentId, startsAt);

    // Find and check availability slot
    const slot = await this.prisma.availabilitySlot.findFirst({
      where: {
        lecturerId: dto.lecturerId,
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
        lecturerId: dto.lecturerId,
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
          lecturerId: dto.lecturerId,
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
        actorId: studentId,
        action: 'SESSION_BOOKED',
        entity: 'SESSION',
        entityId: session.id,
        details: { ip: '127.0.0.1', userAgent: 'ilmconnect-client' },
      },
    });

    return session;
  }

  async validateThreeDayGap(studentId: string, bookingDate: Date) {
    // Determine start and end of week (Monday to Sunday)
    const day = bookingDate.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day; // Adjust to Monday
    
    const startOfWeek = new Date(bookingDate);
    startOfWeek.setDate(bookingDate.getDate() + diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Fetch existing sessions in this week
    const existingSessions = await this.prisma.session.findMany({
      where: {
        studentId,
        status: { in: [SessionStatus.SCHEDULED, SessionStatus.COMPLETED] },
        startsAt: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
    });

    if (existingSessions.length >= 2) {
      throw new BadRequestException('Maximum of 2 weekly sessions allowed');
    }

    if (existingSessions.length === 1) {
      const existingDate = new Date(existingSessions[0].startsAt);
      const existingDay = existingDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
      const newDay = bookingDate.getDay();

      const validPairs = [
        [1, 4], [4, 1], // Mon + Thu
        [2, 5], [5, 2], // Tue + Fri
        [3, 6], [6, 3], // Wed + Sat
      ];

      const isValidPair = validPairs.some(
        ([d1, d2]) => existingDay === d1 && newDay === d2,
      );

      if (!isValidPair) {
        throw new BadRequestException(
          'Mandatory 3-day gap rule must be followed. Sessions must be scheduled on Mon+Thu, Tue+Fri, or Wed+Sat.',
        );
      }
    }
  }

  async cancelBooking(user: { id: string; role?: Role }, sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
    if (!isAdmin && session.studentId !== user.id) {
      throw new ForbiddenException(
        'You are not authorized to cancel this session. It was booked under a different student account.'
      );
    }

    if (session.status !== SessionStatus.SCHEDULED) {
      throw new BadRequestException('Only scheduled sessions can be canceled');
    }

    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const updateStatus = session.startsAt < twentyFourHoursFromNow 
      ? SessionStatus.NO_SHOW_STUDENT // within 24h: counts as used
      : SessionStatus.CANCELED;

    // Release the availability slot back to OPEN if canceled early
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
        action: 'SESSION_CANCELED',
        entity: 'SESSION',
        entityId: sessionId,
        details: { ip: '127.0.0.1', userAgent: 'ilmconnect-client' },
      },
    });

    return updatedSession;
  }

  async getStudentBookings(studentId: string) {
    return this.prisma.session.findMany({
      where: { studentId },
      include: { lecturer: true },
      orderBy: { startsAt: 'asc' },
    });
  }

  async getLecturerBookings(lecturerId: string) {
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

  async rescheduleBooking(user: { id: string; role?: Role }, sessionId: string, newStartsAtISO: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
    if (!isAdmin && session.studentId !== user.id) {
      throw new ForbiddenException(
        'You are not authorized to reschedule this session. It was booked under a different student account.'
      );
    }

    if (session.status !== SessionStatus.SCHEDULED) {
      throw new BadRequestException('Only scheduled sessions can be rescheduled');
    }

    const newStartsAt = new Date(newStartsAtISO);
    const newEndsAt = new Date(newStartsAt.getTime() + 45 * 60 * 1000);

    if (newStartsAt <= new Date()) {
      throw new BadRequestException('Cannot reschedule to a past time');
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

    // Check availability slot for new time
    const newSlot = await this.prisma.availabilitySlot.findFirst({
      where: {
        lecturerId: session.lecturerId,
        startsAt: { lte: newStartsAt },
        endsAt: { gte: newEndsAt },
        status: SlotStatus.OPEN,
      },
    });

    if (newSlot) {
      await this.prisma.availabilitySlot.update({
        where: { id: newSlot.id },
        data: { status: SlotStatus.BOOKED },
      });
    }

    // Update the session times
    const updated = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        startsAt: newStartsAt,
        endsAt: newEndsAt,
      },
      include: { lecturer: true },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'SESSION_RESCHEDULED',
        entity: 'SESSION',
        entityId: sessionId,
        details: { oldStartsAt: session.startsAt, newStartsAt },
      },
    });

    return updated;
  }
}
