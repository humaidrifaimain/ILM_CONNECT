import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FeedbackService', () => {
  const prisma = {
    session: { findFirst: jest.fn() },
    rating: { upsert: jest.fn(), aggregate: jest.fn() },
    lecturerProfile: { update: jest.fn() },
  };
  const service = new FeedbackService(prisma as unknown as PrismaService);
  const session = {
    id: 'session-1', lecturerId: 'lecturer-1', livekitRoomName: 'room-1',
    status: 'COMPLETED', startsAt: new Date(Date.now() - 3600000),
  };
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.session.findFirst.mockResolvedValue(session);
    prisma.rating.upsert.mockResolvedValue({ score: 4, comment: 'Helpful lesson' });
    prisma.rating.aggregate.mockResolvedValue({ _avg: { score: 4 }, _count: { score: 1 } });
  });
  it('rejects a future booking before writing a review', async () => {
    prisma.session.findFirst.mockResolvedValue({ ...session, startsAt: new Date(Date.now() + 3600000) });
    await expect(service.submitFeedback('student-1', 'session-1', 4)).rejects.toThrow('Feedback is available after the session starts');
    expect(prisma.rating.upsert).not.toHaveBeenCalled();
  });
  it('restricts feedback to the student who owns the session', async () => {
    prisma.session.findFirst.mockResolvedValue(null);
    await expect(service.submitFeedback('student-2', 'session-1', 4)).rejects.toThrow(NotFoundException);
    expect(prisma.session.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'session-1', studentId: 'student-2' } }));
    expect(prisma.rating.upsert).not.toHaveBeenCalled();
  });
  it('rejects canceled sessions', async () => {
    prisma.session.findFirst.mockResolvedValue({ ...session, status: 'CANCELED' });
    await expect(service.submitFeedback('student-1', 'session-1', 4)).rejects.toThrow(BadRequestException);
    expect(prisma.rating.upsert).not.toHaveBeenCalled();
  });
  it('validates the rating and review length', async () => {
    await expect(service.submitFeedback('student-1', 'session-1', 6)).rejects.toThrow(BadRequestException);
    await expect(service.submitFeedback('student-1', 'session-1', 4, 'x'.repeat(2001))).rejects.toThrow(BadRequestException);
    expect(prisma.rating.upsert).not.toHaveBeenCalled();
  });
  it('saves or updates feedback and refreshes the lecturer rating', async () => {
    await expect(service.submitFeedback('student-1', 'session-1', 4, ' Helpful lesson ')).resolves.toEqual({ score: 4, comment: 'Helpful lesson' });
    expect(prisma.rating.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { sessionId: 'session-1' }, update: { score: 4, comment: 'Helpful lesson' } }));
    expect(prisma.lecturerProfile.update).toHaveBeenCalledWith({ where: { userId: 'lecturer-1' }, data: { ratingAvg: 4, ratingCount: 1 } });
  });
});
