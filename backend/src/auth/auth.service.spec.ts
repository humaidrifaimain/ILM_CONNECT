import { AuthService } from './auth.service';
import { createHash } from 'node:crypto';
import { Resend } from 'resend';
import { Role, UserStatus } from '@prisma/client';
const send = jest.fn();
jest.mock('resend', () => ({ Resend: jest.fn().mockImplementation(() => ({ emails: { send } })) }));
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
