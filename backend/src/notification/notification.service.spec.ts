import { NotificationService } from './notification.service';

describe('Session notification times', () => {
  const start = new Date('2026-10-08T08:30:00Z');
  const end = new Date('2026-10-08T09:10:00Z');
  const prisma = {
    session: { findUnique: jest.fn(), findMany: jest.fn() },
    studentProfile: { findUnique: jest.fn() },
    notification: { create: jest.fn(), findMany: jest.fn() },
  };
  const email = { buildBookingEmail: jest.fn().mockReturnValue({}), sendEmail: jest.fn() };
  const whatsapp = { sendWhatsApp: jest.fn(), buildBookingMessage: jest.fn() };
  const service = new NotificationService(prisma as any, email as any, whatsapp as any);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.session.findUnique.mockResolvedValue({ startsAt: start, endsAt: end, student: { timezone: 'America/New_York' } });
    prisma.notification.create.mockImplementation(({ data }) => Promise.resolve({ ...data, id: 'notice', createdAt: new Date() }));
  });

  it('uses the saved session and student timezone for database, SSE, and email', async () => {
    const events: any[] = [];
    const subscription = service.getNotificationStream('student').subscribe(event => events.push(event.data));
    await service.dispatchBookingNotification({
      eventType: 'BOOKING_CONFIRMED', sessionId: 'session',
      actor: { id: 'lecturer', name: 'Lecturer', role: 'LECTURER' },
      recipient: { id: 'student', name: 'Student', role: 'STUDENT', email: 'student@example.test' },
      sessionDate: new Date('2026-10-09T10:00:00Z'), sessionTimeFormatted: 'incorrect server time',
    });
    subscription.unsubscribe();
    const payload = prisma.notification.create.mock.calls[0][0].data.payloadJson;
    expect(payload.sessionStartsAt).toBe(start.toISOString());
    expect(payload.sessionTimeFormatted).toBe('04:30 AM to 05:10 AM (America/New_York)');
    expect(events[0].payloadJson).toEqual(payload);
    expect(email.buildBookingEmail).toHaveBeenCalledWith(expect.objectContaining({ sessionTimeFormatted: payload.sessionTimeFormatted }));
    expect(whatsapp.sendWhatsApp).not.toHaveBeenCalled();
  });

  it('formats the previous and new reschedule times in the same timezone', async () => {
    await service.dispatchBookingNotification({
      eventType: 'BOOKING_RESCHEDULED', sessionId: 'session',
      actor: { id: 'lecturer', name: 'Lecturer', role: 'LECTURER' },
      recipient: { id: 'student', name: 'Student', role: 'STUDENT', email: '' },
      sessionDate: start, sessionTimeFormatted: 'ignored', previousStartsAt: new Date('2026-10-07T08:30:00Z'),
    });
    expect(prisma.notification.create.mock.calls[0][0].data.payloadJson.previousTimeFormatted)
      .toContain('Wednesday, Oct 7, 2026 at 04:30 AM to 05:10 AM (America/New_York)');
  });

  it('shows the current schedule and cancellation status on older notices without rewriting event history', async () => {
    prisma.notification.findMany.mockResolvedValue([{ id: 'old', payloadJson: { sessionId: 'session', message: 'Original booking' } }]);
    prisma.studentProfile.findUnique.mockResolvedValue({ timezone: 'Asia/Colombo' });
    prisma.session.findMany.mockResolvedValue([{ id: 'session', startsAt: start, endsAt: end, status: 'CANCELED', lecturer: { fullName: 'Assigned lecturer' } }]);
    const notices = await service.getMyNotifications('student');
    expect(notices[0].payloadJson).toEqual(expect.objectContaining({ message: 'Original booking', currentSession: expect.objectContaining({ status: 'CANCELED', timeFormatted: '02:00 PM to 02:40 PM (Asia/Colombo)' }) }));
    expect(prisma.session.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ OR: [{ studentId: 'student' }, { lecturerId: 'student' }] }) }));
  });
});
