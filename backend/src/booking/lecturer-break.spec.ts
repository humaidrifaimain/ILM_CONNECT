import { Role } from '@prisma/client';
import { BookingService } from './booking.service';
import { AvailabilityService } from '../availability/availability.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

describe('Lecturer breaks', () => {
  const date = (time: string) => new Date(`2050-01-02T${time}:00+05:30`);
  const neighbor = { id: 'neighbor', lecturerId: 'lecturer', studentId: 'other-student', startsAt: date('11:00'), endsAt: date('11:40'), status: 'SCHEDULED' };
  const original = { id: 'original', lecturerId: 'lecturer', studentId: 'student', startsAt: date('13:00'), endsAt: date('13:40'), status: 'SCHEDULED' };
  const intersects = (range: { startsAt?: { lt?: Date }; endsAt?: { gt?: Date } }) =>
    !!range?.startsAt?.lt && !!range?.endsAt?.gt && neighbor.startsAt < range.startsAt.lt && neighbor.endsAt > range.endsAt.gt;
  const prisma = {
    $transaction: jest.fn(), $queryRaw: jest.fn(),
    lecturerProfile: { findUnique: jest.fn() },
    session: { findFirst: jest.fn(), findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), create: jest.fn(), update: jest.fn() },
    availabilitySlot: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    subscription: { findFirst: jest.fn() }, auditLog: { create: jest.fn() }, user: { findUnique: jest.fn() },
  };
  const notifications = { dispatchBookingNotification: jest.fn(), createNotification: jest.fn() };
  const booking = new BookingService(prisma as unknown as PrismaService, notifications as unknown as NotificationService);
  const availability = new AvailabilityService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2049-12-01T00:00:00Z'));
    prisma.$transaction.mockImplementation(callback => callback(prisma));
    prisma.lecturerProfile.findUnique.mockResolvedValue({ hourlyAvailabilityJson: [10, 11, 12, 13] });
    prisma.subscription.findFirst.mockResolvedValue({ tier: 'STANDARD', currentPeriodStart: new Date('2049-01-01'), currentPeriodEnd: new Date('2051-01-01') });
    prisma.session.findUnique.mockResolvedValue(original);
    prisma.session.findUniqueOrThrow.mockResolvedValue(original);
    prisma.session.findFirst.mockImplementation(({ where }) => {
      const range = where.OR?.find((branch: { lecturerId?: string }) => branch.lecturerId === 'lecturer') || (where.lecturerId === 'lecturer' ? where : null);
      return Promise.resolve(intersects(range) ? neighbor : null);
    });
    prisma.session.create.mockImplementation(({ data }) => Promise.resolve(data));
    prisma.session.update.mockImplementation(({ data }) => Promise.resolve({ ...original, ...data }));
    prisma.availabilitySlot.findFirst.mockResolvedValue({ id: 'slot', status: 'OPEN' });
    prisma.availabilitySlot.updateMany.mockResolvedValue({ count: 1 });
    prisma.user.findUnique.mockResolvedValue(null);
    jest.spyOn(booking, 'validateBookingAllowance').mockResolvedValue(undefined);
  });
  afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

  it.each(['11:40', '11:49', '10:11'])('rejects booking at %s without a full ten-minute break', async time => {
    await expect(booking.createBooking({ id: 'admin', role: Role.ADMIN }, { studentId: 'student', lecturerId: 'lecturer', startsAt: date(time).toISOString() })).rejects.toThrow('10 minutes');
    expect(prisma.session.create).not.toHaveBeenCalled();
  });
  it.each(['11:50', '10:10'])('allows booking at %s with exactly ten minutes before or after', async time => {
    const result = await booking.createBooking({ id: 'admin', role: Role.ADMIN }, { studentId: 'student', lecturerId: 'lecturer', startsAt: date(time).toISOString() });
    expect(result.startsAt).toEqual(date(time));
    expect(+result.endsAt - +result.startsAt).toBe(40 * 60_000);
  });
  it.each(['11:49', '10:11'])('rejects rescheduling at %s without a full break', async time => {
    await expect(booking.rescheduleBooking({ id: 'admin', role: Role.ADMIN }, 'original', date(time).toISOString())).rejects.toThrow('10-minute');
    expect(prisma.session.update).not.toHaveBeenCalled();
  });
  it.each(['11:50', '10:10'])('allows rescheduling at %s at the exact boundary', async time => {
    await expect(booking.rescheduleBooking({ id: 'admin', role: Role.ADMIN }, 'original', date(time).toISOString())).resolves.toMatchObject({ startsAt: date(time) });
  });
  it.each([['11:49', false], ['10:11', false], ['11:50', true], ['10:10', true]])('availability at %s preserves the break (allowed=%s)', async (time, allowed) => {
    prisma.availabilitySlot.findFirst.mockImplementation(({ where }) => Promise.resolve(intersects(where) ? { ...neighbor, status: 'BOOKED' } : null));
    prisma.availabilitySlot.create.mockImplementation(({ data }) => Promise.resolve(data));
    const startsAt = date(time as string);
    const result = availability.createSlot('lecturer', { startsAt: startsAt.toISOString(), endsAt: new Date(+startsAt + 40 * 60_000).toISOString() });
    if (allowed) await expect(result).resolves.toMatchObject({ startsAt });
    else await expect(result).rejects.toThrow('10 minutes');
  });
});
