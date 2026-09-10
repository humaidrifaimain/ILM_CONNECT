import { Test, TestingModule } from '@nestjs/testing';
import { BookingService } from './booking.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { BadRequestException } from '@nestjs/common';
import { SessionStatus } from '@prisma/client';

describe('BookingService (3-Day Gap Rule validation)', () => {
  let service: BookingService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        {
          provide: PrismaService,
          useValue: {
            session: {
              findMany: jest.fn(),
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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateThreeDayGap', () => {
    it('should pass if student has no sessions scheduled that week', async () => {
      jest.spyOn(prisma.session, 'findMany').mockResolvedValue([]);

      const testDate = new Date('2026-06-01T10:00:00Z'); // Monday
      await expect(service.validateThreeDayGap('student-id', testDate)).resolves.not.toThrow();
    });

    it('should throw if student already has 2 or more sessions that week', async () => {
      jest.spyOn(prisma.session, 'findMany').mockResolvedValue([
        { startsAt: new Date('2026-06-01T10:00:00Z') }, // Mon
        { startsAt: new Date('2026-06-04T10:00:00Z') }, // Thu
      ] as any);

      const testDate = new Date('2026-06-05T10:00:00Z'); // Friday
      await expect(service.validateThreeDayGap('student-id', testDate)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should count student no-shows as used weekly sessions', async () => {
      const findManySpy = jest.spyOn(prisma.session, 'findMany').mockResolvedValue([
        { startsAt: new Date('2026-06-01T10:00:00Z') }, // Mon
        { startsAt: new Date('2026-06-04T10:00:00Z') }, // Thu
      ] as any);

      const testDate = new Date('2026-06-06T10:00:00Z'); // Saturday
      await expect(service.validateThreeDayGap('student-id', testDate)).rejects.toThrow(
        BadRequestException,
      );

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: {
              in: expect.arrayContaining([SessionStatus.NO_SHOW_STUDENT]),
            },
          }),
        }),
      );
    });

    it('should pass if pairing Monday booking with existing Thursday session', async () => {
      jest.spyOn(prisma.session, 'findMany').mockResolvedValue([
        { startsAt: new Date('2026-06-04T10:00:00Z') }, // Thursday (4)
      ] as any);

      const testDate = new Date('2026-06-01T10:00:00Z'); // Monday (1)
      await expect(service.validateThreeDayGap('student-id', testDate)).resolves.not.toThrow();
    });

    it('should fail if pairing Monday booking with existing Tuesday session (violates gap rule)', async () => {
      jest.spyOn(prisma.session, 'findMany').mockResolvedValue([
        { startsAt: new Date('2026-06-02T10:00:00Z') }, // Tuesday (2)
      ] as any);

      const testDate = new Date('2026-06-01T10:00:00Z'); // Monday (1)
      await expect(service.validateThreeDayGap('student-id', testDate)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
