import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { BookingService } from './booking.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

describe('Booking plan allowances', () => {
  const prisma = { session: { findMany: jest.fn() } };
  const service = new BookingService(prisma as unknown as PrismaService, {} as NotificationService);
  const bookingDate = new Date(2026, 9, 8, 10);
  const existing = (day: number) => ({ startsAt: new Date(2026, 9, day, 10) });
  beforeEach(() => jest.resetAllMocks());
  it('allows different-day bookings within Standard weekly allowance', async () => {
    prisma.session.findMany.mockResolvedValue([existing(6)]);
    await expect(service.validateBookingAllowance('student', bookingDate, 'Standard')).resolves.toBeUndefined();
  });
  it('rejects the third Standard session in the week', async () => {
    prisma.session.findMany.mockResolvedValue([existing(6), existing(7)]);
    await expect(service.validateBookingAllowance('student', bookingDate, 'Standard')).rejects.toThrow(BadRequestException);
  });
  it.each(['Fast Track', 'beginner-qaida-fast-track', 'PREMIUM'])('allows the third weekly session for %s', async tier => {
    prisma.session.findMany.mockResolvedValue([existing(6), existing(7)]);
    await expect(service.validateBookingAllowance('student', bookingDate, tier)).resolves.toBeUndefined();
  });
  it('rejects the fourth Fast Track session in the week', async () => {
    prisma.session.findMany.mockResolvedValue([existing(5), existing(6), existing(7)]);
    await expect(service.validateBookingAllowance('student', bookingDate, 'Fast Track')).rejects.toThrow(BadRequestException);
  });
  it('rejects two sessions on the same day for either plan', async () => {
    prisma.session.findMany.mockResolvedValue([existing(8)]);
    await expect(service.validateBookingAllowance('student', bookingDate, 'Fast Track')).rejects.toThrow(BadRequestException);
  });
});

describe('Session notes and completion ownership', () => {
  const prisma = { session: { findUnique: jest.fn(), update: jest.fn() } };
  const service = new BookingService(prisma as any, {} as any);
  beforeEach(() => { jest.resetAllMocks(); prisma.session.findUnique.mockResolvedValue({ lecturerId: 'lecturer', startsAt: new Date(Date.now() - 1000), status: 'IN_PROGRESS' }); });
  it('blocks another lecturer from changing a session', async () => {
    await expect(service.updateBooking('session', { notes: 'Changed' }, { id: 'outsider', role: Role.LECTURER })).rejects.toThrow('not assigned');
    expect(prisma.session.update).not.toHaveBeenCalled();
  });
  it('completes a started session and saves shared notes', async () => {
    await service.updateBooking('session', { status: 'COMPLETED', notes: 'Lesson complete' }, { id: 'lecturer', role: Role.LECTURER });
    expect(prisma.session.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED', notes: expect.any(Object) }) }));
  });
  it('rejects future completion and status changes which bypass dedicated actions', async () => {
    await expect(service.updateBooking('session', { status: 'CANCELED' }, { id: 'lecturer', role: Role.LECTURER })).rejects.toThrow('cancellation');
    prisma.session.findUnique.mockResolvedValue({ lecturerId: 'lecturer', startsAt: new Date(Date.now() + 3600000), status: 'SCHEDULED' });
    await expect(service.updateBooking('session', { status: 'COMPLETED' }, { id: 'lecturer', role: Role.LECTURER })).rejects.toThrow('started active');
  });
});
