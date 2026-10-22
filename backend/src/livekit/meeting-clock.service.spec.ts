import { MeetingClockService, LESSON_MS, MEETING_MS } from './meeting-clock.service';
import { PrismaService } from '../prisma/prisma.service';
import { LivekitService } from './livekit.service';

describe('Shared meeting clock', () => {
  let session: { id: string; studentId: string; lecturerId: string; status: string; meetingStartedAt: Date | null; livekitRoomName: string };
  const prisma = { $transaction: jest.fn(), $queryRaw: jest.fn(), session: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() } };
  const livekit = { endRoom: jest.fn(), getRoomName: jest.fn() };
  const service = new MeetingClockService(prisma as unknown as PrismaService, livekit as unknown as LivekitService);
  const lecturer = { id: 'lecturer', role: 'LECTURER' };
  const student = { id: 'student', role: 'STUDENT' };
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2050-01-02T10:00:00Z'));
    session = { id: 'session', studentId: 'student', lecturerId: 'lecturer', status: 'IN_PROGRESS', meetingStartedAt: null, livekitRoomName: 'room' };
    prisma.$transaction.mockImplementation(callback => callback(prisma));
    prisma.session.findUnique.mockImplementation(() => Promise.resolve({ ...session }));
    prisma.session.findUniqueOrThrow.mockImplementation(() => Promise.resolve({ ...session }));
    prisma.session.findMany.mockImplementation(() => Promise.resolve(session.meetingStartedAt && +session.meetingStartedAt <= Date.now() - MEETING_MS && session.status === 'IN_PROGRESS' ? [{ id: session.id }] : []));
    prisma.session.updateMany.mockImplementation(({ where, data }) => {
      if (where.meetingStartedAt === null && session.meetingStartedAt !== null) return Promise.resolve({ count: 0 });
      Object.assign(session, data); return Promise.resolve({ count: 1 });
    });
    livekit.endRoom.mockResolvedValue(undefined);
  });
  afterEach(() => { service.onModuleDestroy(); jest.useRealTimers(); });
  it('starts once and shares the original clock after reconnects', async () => {
    const first = await service.start(lecturer, session.id);
    jest.advanceTimersByTime(5 * 60_000);
    const reconnect = await service.start(lecturer, session.id);
    const observer = await service.snapshot(student, session.id);
    expect(reconnect.meetingStartedAt).toEqual(first.meetingStartedAt);
    expect(observer.meetingStartedAt).toEqual(first.meetingStartedAt);
    expect(+first.warningAt! - +first.meetingStartedAt!).toBe(LESSON_MS);
    expect(+first.meetingEndsAt! - +first.meetingStartedAt!).toBe(MEETING_MS);
  });
  it('waits for the lecturer, prevents student starts and rejects outsiders', async () => {
    await expect(service.snapshot(student, session.id)).resolves.toMatchObject({ meetingStartedAt: null });
    await expect(service.start(student, session.id)).rejects.toThrow('assigned lecturer');
    await expect(service.snapshot({ id: 'outsider', role: 'STUDENT' }, session.id)).rejects.toThrow('participant');
  });
  it('allows the five-minute extension then deletes the room at exactly 45 minutes', async () => {
    await service.start(lecturer, session.id);
    jest.advanceTimersByTime(LESSON_MS);
    await service.sweep();
    expect(livekit.endRoom).not.toHaveBeenCalled();
    jest.advanceTimersByTime(5 * 60_000 - 1);
    await service.sweep();
    expect(livekit.endRoom).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    await service.sweep();
    expect(livekit.endRoom).toHaveBeenCalledWith('room');
    expect(session.status).toBe('COMPLETED');
  });
  it('retries failed room shutdowns without prematurely completing the session', async () => {
    await service.start(lecturer, session.id);
    jest.advanceTimersByTime(MEETING_MS);
    livekit.endRoom.mockRejectedValueOnce(new Error('Temporary network failure'));
    await service.sweep();
    expect(session.status).toBe('IN_PROGRESS');
    await service.sweep();
    expect(session.status).toBe('COMPLETED');
    expect(livekit.endRoom).toHaveBeenCalledTimes(2);
  });
  it('ends persisted overdue rooms after a server restart with no clients polling', async () => {
    session.meetingStartedAt = new Date(Date.now() - MEETING_MS - 1);
    await service.sweep();
    expect(livekit.endRoom).toHaveBeenCalledWith('room');
    expect(session.status).toBe('COMPLETED');
  });
  it('ends the room from its periodic worker without a clock request', async () => {
    session.meetingStartedAt = new Date(Date.now() - MEETING_MS + 1000);
    service.onModuleInit();
    await jest.advanceTimersByTimeAsync(1000);
    expect(livekit.endRoom).toHaveBeenCalledWith('room');
    expect(session.status).toBe('COMPLETED');
  });
});
