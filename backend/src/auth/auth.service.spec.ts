import { AuthService } from './auth.service';
import { createHash } from 'node:crypto';
import { Resend } from 'resend';
import { Role, UserStatus } from '@prisma/client';
const send = jest.fn();
jest.mock('resend', () => ({ Resend: jest.fn().mockImplementation(() => ({ emails: { send } })) }));
describe('Automatic student assignment requests', () => {
  const tx = {
    user: { create: jest.fn() }, studentProfile: { create: jest.fn() }, lecturerProfile: { create: jest.fn() },
    supportTicket: { create: jest.fn() }, auditLog: { create: jest.fn() },
  };
  const prisma = { user: { findUnique: jest.fn() }, $transaction: jest.fn() };
  const service = new AuthService(prisma as any, {} as any);
  const registration = { email: 'new@example.test', password: 'Password123!', fullName: 'New Student', phone: '000000000', country: 'Sri Lanka', timezone: 'Asia/Colombo', preferredHours: [14, 15, 16, 17] };
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(callback => callback(tx));
    tx.user.create.mockResolvedValue({ id: 'new', role: Role.STUDENT });
  });
  it('creates the profile and pending request in the registration transaction', async () => {
    await service.register(registration);
    expect(tx.studentProfile.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ preferredHours: registration.preferredHours }) }));
    expect(tx.supportTicket.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 'new', type: 'STUDENT_REGISTRATION', status: 'PENDING' }) });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
  it('does not create a student assignment request for lecturer signup', async () => {
    await service.register({ ...registration, role: Role.LECTURER });
    expect(tx.supportTicket.create).not.toHaveBeenCalled();
  });
  it('saves gender and date of birth when creating the account', async () => {
    await service.register({ ...registration, gender: 'FEMALE', dateOfBirth: '2000-02-29' });
    expect(tx.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ gender: 'FEMALE', dateOfBirth: new Date('2000-02-29T00:00:00.000Z') }) });
  });
  it('saves the selected country and normalized WhatsApp number in the student profile', async () => {
    await service.register({ ...registration, country: 'United Kingdom', phone: '+44 7700 900123' });
    expect(tx.studentProfile.create).toHaveBeenCalledWith({ data: expect.objectContaining({ country: 'United Kingdom', phone: '+447700900123' }) });
  });
  it('rejects malformed international WhatsApp numbers before creating an account', async () => {
    await expect(service.register({ ...registration, phone: '+94abc' })).rejects.toThrow('valid WhatsApp number');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it.each(['2001-02-29', '2000-02-30', '2999-01-01', 'not-a-date', '2000-01-01T12:00:00Z', '0000-01-01'])('rejects invalid or future birth date %s before creating an account', async (dateOfBirth) => {
    await expect(service.register({ ...registration, dateOfBirth })).rejects.toThrow('valid date of birth');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('rejects unsupported gender values before creating an account', async () => {
    await expect(service.register({ ...registration, gender: 'INVALID' })).rejects.toThrow('valid gender');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('fails signup when the assignment request cannot be saved', async () => {
    tx.supportTicket.create.mockRejectedValue(new Error('Request unavailable'));
    await expect(service.register(registration)).rejects.toThrow('Request unavailable');
  });
});
describe('Password recovery', () => {
  const user = { id: 'student', status: UserStatus.ACTIVE, deletedAt: null, email: 'student@example.test' };
  const tx = { passwordReset: { deleteMany: jest.fn() }, user: { update: jest.fn() }, auditLog: { create: jest.fn() } };
  const prisma = { user: { findUnique: jest.fn() }, passwordReset: { findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn(), delete: jest.fn() }, $transaction: jest.fn() };
  const service = new AuthService(prisma as any, {} as any);
  const original = process.env.RESEND_API_KEY;
  beforeEach(() => { jest.resetAllMocks(); (Resend as unknown as jest.Mock).mockImplementation(() => ({ emails: { send } })); process.env.RESEND_API_KEY = 'test-key'; prisma.user.findUnique.mockResolvedValue(user); prisma.passwordReset.create.mockResolvedValue({ id: 'reset' }); send.mockResolvedValue({ data: { id: 'email' } }); prisma.$transaction.mockImplementation(fn => fn(tx)); tx.passwordReset.deleteMany.mockResolvedValue({ count: 1 }); });
  afterAll(() => { if (original === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = original; });
  it('stores only a hash and emails an expiring link', async () => {
    await service.requestPasswordReset('student@example.test');
    const text = send.mock.calls[0][0].text;
    const token = text.match(/token=([a-f0-9]{64})/)[1];
    expect(prisma.passwordReset.create).toHaveBeenCalledWith({ data: expect.objectContaining({ tokenHash: createHash('sha256').update(token).digest('hex'), userId: 'student', expiresAt: expect.any(Date) }) });
  });
  it('does not reveal account existence or send email for an unknown account', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.requestPasswordReset('unknown@example.test')).resolves.toEqual(expect.objectContaining({ message: expect.stringContaining('If an active account') }));
    expect(send).not.toHaveBeenCalled();
  });
  it('fails honestly when email delivery is unavailable', async () => {
    delete process.env.RESEND_API_KEY;
    await expect(service.requestPasswordReset('student@example.test')).rejects.toThrow('not configured');
    process.env.RESEND_API_KEY = 'test-key'; send.mockResolvedValue({ error: { message: 'rejected' } });
    await expect(service.requestPasswordReset('student@example.test')).rejects.toThrow('Unable to send');
    expect(prisma.passwordReset.delete).toHaveBeenCalledWith({ where: { id: 'reset' } });
  });
  it('rejects expired and malformed reset tokens without changing the password', async () => {
    await expect(service.resetPassword('wrong', 'newpassword')).rejects.toThrow('Invalid or expired');
    prisma.passwordReset.findUnique.mockResolvedValue({ id: 'reset', userId: 'student', user, expiresAt: new Date(Date.now() - 1) });
    await expect(service.resetPassword('a'.repeat(64), 'newpassword')).rejects.toThrow('Invalid or expired');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('consumes the token once and invalidates existing login tokens', async () => {
    prisma.passwordReset.findUnique.mockResolvedValue({ id: 'reset', userId: 'student', user, expiresAt: new Date(Date.now() + 60000) });
    await service.resetPassword('a'.repeat(64), 'newpassword');
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: 'student' }, data: { passwordHash: expect.stringMatching(/^\$2/), tokenVersion: { increment: 1 } } });
    tx.passwordReset.deleteMany.mockResolvedValue({ count: 0 });
    tx.user.update.mockClear();
    await expect(service.resetPassword('a'.repeat(64), 'newpassword')).rejects.toThrow('Invalid or expired');
    expect(tx.user.update).not.toHaveBeenCalled();
  });
  it('throttles repeated reset requests for the same account', async () => {
    prisma.passwordReset.findFirst.mockResolvedValue({ id: 'recent' });
    await service.requestPasswordReset('student@example.test');
    expect(send).not.toHaveBeenCalled();
  });
});
