import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { LivekitController } from './livekit.controller';

describe('Classroom admission', () => {
  const prisma = {
    session: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), updateMany: jest.fn() },
    subscription: { findFirst: jest.fn() },
    notification: { findFirst: jest.fn() },
  };
  const livekit = { generateToken: jest.fn() };
  const controller = new LivekitController(livekit as any, prisma as any, {} as any, { finishExpired: jest.fn() } as any, {} as any);
  const session = {
    id: 'session-1', studentId: 'student-1', lecturerId: 'lecturer-1',
    student: { fullName: 'Student' }, lecturer: { fullName: 'Lecturer' },
    status: 'SCHEDULED', livekitRoomName: 'room-1',
    startsAt: new Date(Date.now() + 24 * 60 * 60000),
    endsAt: new Date(Date.now() + 25 * 60 * 60000),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.session.findUnique.mockResolvedValue(session);
    prisma.session.findUniqueOrThrow.mockResolvedValue({ ...session, status: 'IN_PROGRESS' });
    prisma.session.updateMany.mockResolvedValue({ count: 1 });
    prisma.subscription.findFirst.mockResolvedValue({ id: 'subscription-1' });
    prisma.notification.findFirst.mockResolvedValue({ id: 'notification-1' });
    livekit.generateToken.mockResolvedValue({ token: 'classroom-token', wsUrl: 'wss://classroom.test' });
  });

  it.each(['STUDENT', 'LECTURER'])('allows %s to join more than 30 minutes early', async role => {
    const id = role === 'STUDENT' ? session.studentId : session.lecturerId;
    await expect(controller.getToken({ user: { id, role } }, session.id)).resolves.toMatchObject({ token: 'classroom-token' });
    expect(prisma.session.updateMany).not.toHaveBeenCalled();
  });

  it.each(['STUDENT', 'LECTURER'])('allows %s to join after the former two-hour cutoff', async role => {
    prisma.session.findUnique.mockResolvedValue({ ...session, startsAt: new Date(Date.now() - 24 * 60 * 60000), endsAt: new Date(Date.now() - 23 * 60 * 60000) });
    const id = role === 'STUDENT' ? session.studentId : session.lecturerId;
    await expect(controller.getToken({ user: { id, role } }, session.id)).resolves.toMatchObject({ token: 'classroom-token' });
    expect(prisma.session.updateMany).toHaveBeenCalled();
  });

  it.each(['COMPLETED', 'NO_SHOW_LECTURER', 'CANCELED', 'NO_SHOW_STUDENT'])('still rejects %s sessions', async status => {
    prisma.session.findUnique.mockResolvedValue({ ...session, status });
    await expect(controller.getToken({ user: { id: session.studentId, role: 'STUDENT' } }, session.id)).rejects.toThrow(BadRequestException);
    expect(livekit.generateToken).not.toHaveBeenCalled();
  });

  it('still rejects users who are not participants', async () => {
    await expect(controller.getToken({ user: { id: 'other-student', role: 'STUDENT' } }, session.id)).rejects.toThrow(ForbiddenException);
    expect(livekit.generateToken).not.toHaveBeenCalled();
  });

  it('still requires an active student subscription', async () => {
    prisma.subscription.findFirst.mockResolvedValue(null);
    await expect(controller.getToken({ user: { id: session.studentId, role: 'STUDENT' } }, session.id)).rejects.toThrow(ForbiddenException);
    expect(livekit.generateToken).not.toHaveBeenCalled();
  });

  it.each(['STUDENT', 'LECTURER'])('rejects a %s reconnect after the saved 45-minute deadline', async role => {
    prisma.session.findUnique.mockResolvedValue({ ...session, status: 'IN_PROGRESS', meetingStartedAt: new Date(Date.now() - 45 * 60_000) });
    const id = role === 'STUDENT' ? session.studentId : session.lecturerId;
    await expect(controller.getToken({ user: { id, role } }, session.id)).rejects.toThrow('45-minute');
    expect(livekit.generateToken).not.toHaveBeenCalled();
  });
});
