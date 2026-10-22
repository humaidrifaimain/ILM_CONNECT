import { StudentAttendanceService, STUDENT_WAIT_MS, STUDENT_REMINDER_MS } from './student-attendance.service';

describe('Student classroom attendance', () => {
  const now = new Date('2026-10-07T10:00:00Z');
  const lecturer = { id: 'lecturer', role: 'LECTURER' };
  const student = { id: 'student', role: 'STUDENT' };
  let session: any;
  const prisma = { session: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn() }, $transaction: jest.fn(), $queryRaw: jest.fn() };
  const livekit = { isConfigured: jest.fn(), studentIsPresent: jest.fn(), endRoom: jest.fn(), getRoomName: jest.fn() };
  const bookings = { markStudentAbsent: jest.fn() };
  const service = new StudentAttendanceService(prisma as any, livekit as any, bookings as any);
  beforeEach(() => {
    jest.resetAllMocks(); jest.useFakeTimers().setSystemTime(now);
    session = { id: 'session', studentId: 'student', lecturerId: 'lecturer', startsAt: new Date(+now - 3600000), meetingStartedAt: null,
      status: 'IN_PROGRESS', livekitRoomName: 'room', studentJoinedAt: null, studentLastSeenAt: null, studentLeftAt: null, attendancePromptAfter: null, attendanceResetAt: null };
    prisma.session.findUnique.mockImplementation(async () => ({ ...session }));
    prisma.session.findUniqueOrThrow.mockImplementation(async () => ({ ...session }));
    prisma.session.findFirst.mockImplementation(async () => ({ ...session }));
    prisma.$transaction.mockImplementation(callback => callback(prisma));
    prisma.session.update.mockImplementation(async ({ data }) => { Object.assign(session, data); return { ...session }; });
    prisma.session.updateMany.mockImplementation(async ({ data }) => { Object.assign(session, data); return { count: 1 }; });
    livekit.isConfigured.mockReturnValue(false);
    livekit.studentIsPresent.mockResolvedValue(false);
    livekit.endRoom.mockResolvedValue(undefined);
  });
  afterEach(() => jest.useRealTimers());

  it('does not start an absence countdown until the lecturer starts the meeting', async () => {
    expect(await service.snapshot(lecturer, session.id)).toMatchObject({ promptAt: null, shouldPrompt: false });
  });
  it('prompts exactly at fifteen minutes and not one millisecond earlier', async () => {
    session.meetingStartedAt = new Date(+now - STUDENT_WAIT_MS + 1);
    expect((await service.snapshot(lecturer, session.id)).shouldPrompt).toBe(false);
    jest.advanceTimersByTime(1);
    expect((await service.snapshot(lecturer, session.id)).shouldPrompt).toBe(true);
  });
  it('does not penalize an early lecturer before the scheduled class starts', async () => {
    session.meetingStartedAt = new Date(+now - STUDENT_WAIT_MS);
    session.startsAt = new Date(+now + 60_000);
    expect((await service.snapshot(lecturer, session.id)).shouldPrompt).toBe(false);
  });
  it('records the first student connection and suppresses prompts after a disconnection', async () => {
    session.meetingStartedAt = new Date(+now - STUDENT_WAIT_MS);
    await service.heartbeat(student, session.id);
    expect((await service.snapshot(lecturer, session.id))).toMatchObject({ studentPresent: true, shouldPrompt: false });
    jest.advanceTimersByTime(20_000);
    expect((await service.snapshot(lecturer, session.id))).toMatchObject({ studentPresent: false, studentJoinedAt: now, shouldPrompt: false });
    await service.heartbeat(student, session.id);
    expect(session.studentJoinedAt).toEqual(now);
  });
  it('verifies a production classroom connection instead of accepting a client claim', async () => {
    livekit.isConfigured.mockReturnValue(true);
    await expect(service.heartbeat(student, session.id)).rejects.toThrow('has not connected');
    expect(session.studentJoinedAt).toBeNull();
    livekit.studentIsPresent.mockResolvedValue(true);
    await service.heartbeat(student, session.id);
    expect(session.studentJoinedAt).toEqual(now);
  });
  it('reports unknown attendance when the provider fails and does not offer absence', async () => {
    session.meetingStartedAt = new Date(+now - STUDENT_WAIT_MS);
    livekit.isConfigured.mockReturnValue(true);
    livekit.studentIsPresent.mockRejectedValue(new Error('Provider down'));
    expect(await service.snapshot(lecturer, session.id)).toMatchObject({ studentPresent: null, detectionAvailable: false, shouldPrompt: false });
    await expect(service.markAbsent(lecturer, session.id)).rejects.toThrow('not awaiting');
    expect(bookings.markStudentAbsent).not.toHaveBeenCalled();
  });
  it('persists a five-minute wait and prompts again only when it ends', async () => {
    session.meetingStartedAt = new Date(+now - STUDENT_WAIT_MS);
    expect((await service.wait(lecturer, session.id)).shouldPrompt).toBe(false);
    expect(+session.attendancePromptAfter - +now).toBe(STUDENT_REMINDER_MS);
    jest.advanceTimersByTime(STUDENT_REMINDER_MS - 1);
    expect((await service.snapshot(lecturer, session.id)).shouldPrompt).toBe(false);
    jest.advanceTimersByTime(1);
    expect((await service.snapshot(lecturer, session.id)).shouldPrompt).toBe(true);
  });
  it('restricts attendance decisions and connection reports to the appropriate users', async () => {
    await expect(service.snapshot({ id: 'outsider', role: 'LECTURER' }, session.id)).rejects.toThrow('not authorized');
    await expect(service.wait(student, session.id)).rejects.toThrow('not authorized');
    await expect(service.markAbsent(student, session.id)).rejects.toThrow('not authorized');
    await expect(service.heartbeat(lecturer, session.id)).rejects.toThrow('Only the assigned student');
  });
  it('never treats another participant as the assigned student', async () => {
    await service.webhook({ event: 'participant_joined', room: { name: 'room' }, participant: { identity: 'lecturer:lecturer' } });
    expect(prisma.session.findFirst).not.toHaveBeenCalled();
    await service.recordConnection(session.id, 'other-student', true);
    expect(session.studentJoinedAt).toBeNull();
  });
  it('handles late webhook delivery without reversing newer presence or losing the first join', async () => {
    await service.recordConnection(session.id, 'student', true, new Date(+now - 2000));
    await service.recordConnection(session.id, 'student', false, now);
    await service.recordConnection(session.id, 'student', true, new Date(+now - 3000));
    expect(session.studentJoinedAt).toEqual(new Date(+now - 3000));
    expect(session.studentLeftAt).toEqual(now);
  });
  it('ignores attendance from a previous reopened attempt and closed sessions', async () => {
    session.attendanceResetAt = now;
    await service.recordConnection(session.id, 'student', true, new Date(+now - 60_000));
    expect(session.studentJoinedAt).toBeNull();
    session.status = 'NO_SHOW_STUDENT';
    await service.recordConnection(session.id, 'student', true);
    expect(session.studentJoinedAt).toBeNull();
  });
  it('rechecks live presence before closing a meeting for absence', async () => {
    session.meetingStartedAt = new Date(+now - STUDENT_WAIT_MS);
    livekit.isConfigured.mockReturnValue(true);
    livekit.studentIsPresent.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    bookings.markStudentAbsent.mockImplementation((_user, _id, _reason, _role, options) => options.closeMeeting());
    await expect(service.markAbsent(lecturer, session.id)).rejects.toThrow('student has joined');
    expect(livekit.endRoom).not.toHaveBeenCalled();
  });
});
