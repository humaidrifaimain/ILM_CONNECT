import { Test, TestingModule } from '@nestjs/testing';
import { BookingService } from './booking.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role, SessionStatus, SlotStatus } from '@prisma/client';

describe('BookingService - Business Rules', () => {
  let service: BookingService;
  let prisma: PrismaService;
  let notificationService: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        {
          provide: PrismaService,
          useValue: {
            session: {
              findUnique: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              findFirst: jest.fn(),
            },
            availabilitySlot: {
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            auditLog: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: NotificationService,
          useValue: {
            dispatchBookingNotification: jest.fn(),
            createNotification: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    prisma = module.get<PrismaService>(PrismaService);
    notificationService = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('cancelBooking', () => {
    const mockSession = (startsAt: Date, studentId: string = 'student1', lecturerId: string = 'lecturer1') => ({
      id: 'session1',
      studentId,
      lecturerId,
      startsAt,
      status: SessionStatus.SCHEDULED,
      student: { user: { email: 'student@test.com' } },
      lecturer: { user: { email: 'lecturer@test.com' } },
    });

    describe('Student Cancellation (12-hour rule)', () => {
      it('should allow student to cancel > 12 hours before start', async () => {
        const startsAt = new Date(Date.now() + 13 * 60 * 60 * 1000); // 13 hours from now
        jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession(startsAt) as any);
        jest.spyOn(prisma.session, 'update').mockResolvedValue({} as any);

        await expect(
          service.cancelBooking({ id: 'student1', role: Role.STUDENT }, 'session1')
        ).resolves.toBeDefined();
        
        expect(prisma.session.update).toHaveBeenCalledWith(expect.objectContaining({
          data: { status: SessionStatus.NO_SHOW_STUDENT } // because it's within 24h, wait, let's check
        }));
      });

      it('should NOT allow student to cancel < 12 hours before start', async () => {
        const startsAt = new Date(Date.now() + 11 * 60 * 60 * 1000); // 11 hours from now
        jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession(startsAt) as any);

        await expect(
          service.cancelBooking({ id: 'student1', role: Role.STUDENT }, 'session1')
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('Lecturer Cancellation (6-hour rule)', () => {
      it('should allow lecturer to cancel > 6 hours before start', async () => {
        const startsAt = new Date(Date.now() + 7 * 60 * 60 * 1000); // 7 hours from now
        jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession(startsAt) as any);
        jest.spyOn(prisma.availabilitySlot, 'findFirst').mockResolvedValue({ id: 'slot1' } as any);
        jest.spyOn(prisma.session, 'update').mockResolvedValue({} as any);

        await expect(
          service.cancelBooking({ id: 'lecturer1', role: Role.LECTURER }, 'session1')
        ).resolves.toBeDefined();

        expect(prisma.session.update).toHaveBeenCalledWith(expect.objectContaining({
          data: { status: SessionStatus.CANCELED }
        }));
      });

      it('should NOT allow lecturer to cancel < 6 hours before start', async () => {
        const startsAt = new Date(Date.now() + 5 * 60 * 60 * 1000); // 5 hours from now
        jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession(startsAt) as any);

        await expect(
          service.cancelBooking({ id: 'lecturer1', role: Role.LECTURER }, 'session1')
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('Admin Override', () => {
      it('should allow admin to cancel at any time', async () => {
        const startsAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour from now
        jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession(startsAt) as any);
        jest.spyOn(prisma.session, 'update').mockResolvedValue({} as any);

        await expect(
          service.cancelBooking({ id: 'admin1', role: Role.ADMIN }, 'session1')
        ).resolves.toBeDefined();
      });
    });
  });

  describe('rescheduleBooking', () => {
    const mockSession = (startsAt: Date, endsAt: Date, studentId: string = 'student1', lecturerId: string = 'lecturer1') => ({
      id: 'session1',
      studentId,
      lecturerId,
      startsAt,
      endsAt,
      status: SessionStatus.SCHEDULED,
      student: { user: { email: 'student@test.com' } },
      lecturer: { user: { email: 'lecturer@test.com' } },
    });

    const newStartsAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    beforeEach(() => {
      jest.spyOn(prisma.availabilitySlot, 'findFirst').mockResolvedValue({ id: 'slot1', status: SlotStatus.OPEN } as any);
      jest.spyOn(prisma.session, 'update').mockResolvedValue({} as any);
    });

    describe('Student Rescheduling (12-hour rule)', () => {
      it('should allow student to reschedule > 12 hours before start', async () => {
        const startsAt = new Date(Date.now() + 13 * 60 * 60 * 1000); // 13 hours from now
        const endsAt = new Date(startsAt.getTime() + 40 * 60 * 1000);
        jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession(startsAt, endsAt) as any);

        await expect(
          service.rescheduleBooking({ id: 'student1', role: Role.STUDENT }, 'session1', newStartsAt)
        ).resolves.toBeDefined();
      });

      it('should NOT allow student to reschedule < 12 hours before start', async () => {
        const startsAt = new Date(Date.now() + 11 * 60 * 60 * 1000); // 11 hours from now
        const endsAt = new Date(startsAt.getTime() + 40 * 60 * 1000);
        jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession(startsAt, endsAt) as any);

        await expect(
          service.rescheduleBooking({ id: 'student1', role: Role.STUDENT }, 'session1', newStartsAt)
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('Lecturer Rescheduling (6-hour rule & post-session)', () => {
      it('should allow lecturer to reschedule > 6 hours before start', async () => {
        const startsAt = new Date(Date.now() + 7 * 60 * 60 * 1000); // 7 hours from now
        const endsAt = new Date(startsAt.getTime() + 40 * 60 * 1000);
        jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession(startsAt, endsAt) as any);

        await expect(
          service.rescheduleBooking({ id: 'lecturer1', role: Role.LECTURER }, 'session1', newStartsAt)
        ).resolves.toBeDefined();
      });

      it('should NOT allow lecturer to reschedule < 6 hours before start', async () => {
        const startsAt = new Date(Date.now() + 5 * 60 * 60 * 1000); // 5 hours from now
        const endsAt = new Date(startsAt.getTime() + 40 * 60 * 1000);
        jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession(startsAt, endsAt) as any);

        await expect(
          service.rescheduleBooking({ id: 'lecturer1', role: Role.LECTURER }, 'session1', newStartsAt)
        ).rejects.toThrow(BadRequestException);
      });

      it('should allow lecturer to reschedule within 6 hours AFTER class concludes', async () => {
        const endsAt = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
        const startsAt = new Date(endsAt.getTime() - 40 * 60 * 1000);
        jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession(startsAt, endsAt) as any);

        await expect(
          service.rescheduleBooking({ id: 'lecturer1', role: Role.LECTURER }, 'session1', newStartsAt)
        ).resolves.toBeDefined();
      });

      it('should NOT allow lecturer to reschedule > 6 hours AFTER class concludes', async () => {
        const endsAt = new Date(Date.now() - 7 * 60 * 60 * 1000); // 7 hours ago
        const startsAt = new Date(endsAt.getTime() - 40 * 60 * 1000);
        jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession(startsAt, endsAt) as any);

        await expect(
          service.rescheduleBooking({ id: 'lecturer1', role: Role.LECTURER }, 'session1', newStartsAt)
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('markStudentAbsent', () => {
    const mockSession = (status: SessionStatus, lecturerId: string = 'lecturer1') => ({
      id: 'session1',
      studentId: 'student1',
      lecturerId,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 40 * 60 * 1000),
      status,
      student: { user: { email: 'student@test.com' } },
      lecturer: { user: { email: 'lecturer@test.com' } },
    });

    it('should allow lecturer to mark absent for SCHEDULED session', async () => {
      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession(SessionStatus.SCHEDULED) as any);
      jest.spyOn(prisma.session, 'update').mockResolvedValue({} as any);

      await expect(
        service.markStudentAbsent({ id: 'lecturer1', role: Role.LECTURER }, 'session1')
      ).resolves.toBeDefined();
      
      expect(prisma.session.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: SessionStatus.NO_SHOW_STUDENT })
      }));
    });

    it('should NOT allow marking absent for COMPLETED session', async () => {
      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession(SessionStatus.COMPLETED) as any);

      await expect(
        service.markStudentAbsent({ id: 'lecturer1', role: Role.LECTURER }, 'session1')
      ).rejects.toThrow(BadRequestException);
    });

    it('should NOT allow marking absent for CANCELED session', async () => {
      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession(SessionStatus.CANCELED) as any);

      await expect(
        service.markStudentAbsent({ id: 'lecturer1', role: Role.LECTURER }, 'session1')
      ).rejects.toThrow(BadRequestException);
    });

    it('should NOT allow student to mark themselves absent', async () => {
      jest.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession(SessionStatus.SCHEDULED) as any);

      await expect(
        service.markStudentAbsent({ id: 'student1', role: Role.STUDENT }, 'session1')
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
