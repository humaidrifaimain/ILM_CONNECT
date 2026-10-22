import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role, UserStatus } from '@prisma/client';

describe('Lecturer matching by student availability', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    lecturerProfile: { findUnique: jest.fn() },
    studentProfile: { update: jest.fn() },
    supportTicket: { findUnique: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  const service = new AdminService(prisma as any);
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(callback => callback(prisma));
    prisma.supportTicket.findUnique.mockResolvedValue({ id: 'request', userId: 'student', type: 'STUDENT_REGISTRATION', status: 'PENDING' });
    prisma.user.findUnique.mockResolvedValue({ email: 'student@example.test', status: UserStatus.ACTIVE, role: Role.STUDENT, studentProfile: { preferredHours: [14, 15, 16, 17] } });
    prisma.lecturerProfile.findUnique.mockResolvedValue({ status: UserStatus.ACTIVE, user: { role: Role.LECTURER, status: UserStatus.ACTIVE }, hourlyAvailabilityJson: [10, 11, 12, 13] });
  });
  it('rejects an active lecturer whose shift does not overlap', async () => {
    await expect(service.assignLecturerForRequest('request', 'lecturer', 'admin')).rejects.toThrow('no shift');
    expect(prisma.studentProfile.update).not.toHaveBeenCalled();
    expect(prisma.supportTicket.update).not.toHaveBeenCalled();
  });
  it('allows a matching shift', async () => {
    prisma.lecturerProfile.findUnique.mockResolvedValue({ status: UserStatus.ACTIVE, user: { role: Role.LECTURER, status: UserStatus.ACTIVE }, hourlyAvailabilityJson: [14, 15, 16, 17] });
    await service.assignLecturerForRequest('request', 'lecturer', 'admin');
    expect(prisma.studentProfile.update).toHaveBeenCalledWith(expect.objectContaining({ data: { assignedLecturerId: 'lecturer' } }));
    expect(prisma.supportTicket.update).toHaveBeenCalledWith({ where: { id: 'request' }, data: { status: 'RESOLVED', resolvedAt: expect.any(Date) } });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ details: { studentUserId: 'student', lecturerUserId: 'lecturer', requestId: 'request' } }) }));
  });
  it.each([{ type: 'GENERAL_SUPPORT', status: 'PENDING' }, { type: 'STUDENT_REGISTRATION', status: 'RESOLVED' }])('rejects requests that cannot be assigned: %p', request => {
    prisma.supportTicket.findUnique.mockResolvedValue({ ...request, userId: 'student' });
    return expect(service.assignLecturerForRequest('request', 'lecturer', 'admin')).rejects.toThrow();
  });
  it('rejects registration reassignment after a lecturer was already assigned', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: Role.STUDENT, status: UserStatus.ACTIVE, studentProfile: { assignedLecturerId: 'existing' } });
    await expect(service.assignLecturerForRequest('request', 'lecturer', 'admin')).rejects.toThrow('already has a lecturer');
    expect(prisma.studentProfile.update).not.toHaveBeenCalled();
  });
});

describe('Finance overview', () => {
  const prisma = { payment: { findMany: jest.fn() }, payout: { findMany: jest.fn() } };
  const service = new AdminService(prisma as unknown as PrismaService);
  beforeEach(() => jest.resetAllMocks());
  it('returns an empty breakdown when no successful payments exist', async () => {
    prisma.payment.findMany.mockResolvedValue([]);
    prisma.payout.findMany.mockResolvedValue([]);
    await expect(service.getFinanceOverview()).resolves.toEqual({ payments: [], payouts: [], revenueByPlan: [], exchangeRates: [], pricing: [] });
  });
  it('uses successful monthly payments and counts each paying student once per plan', async () => {
    prisma.payment.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
      { amountLkr: 100, subscription: { tier: 'Standard', studentId: 'one' } },
      { amountLkr: 50, subscription: { tier: 'Standard', studentId: 'one' } },
      { amountLkr: 80, subscription: { tier: 'Fast Track', studentId: 'two' } },
    ]);
    prisma.payout.findMany.mockResolvedValue([]);
    const result = await service.getFinanceOverview();
    expect(result.revenueByPlan).toEqual([{ tier: 'Standard', revenue: 150, students: 1 }, { tier: 'Fast Track', revenue: 80, students: 1 }]);
    expect(prisma.payment.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { status: 'SUCCESSFUL', processedAt: { gte: expect.any(Date) } } }));
  });
});

describe('Administrative account changes', () => {
  const tx = {
    user: { update: jest.fn() },
    lecturerProfile: { updateMany: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = {
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new AdminService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(callback => callback(tx));
    prisma.user.findUnique.mockResolvedValue({ id: 'lecturer', role: Role.LECTURER, status: UserStatus.ACTIVE });
    tx.user.update.mockResolvedValue({ id: 'lecturer', status: UserStatus.SUSPENDED });
  });

  it('revokes old sessions and synchronizes the lecturer status when suspended', async () => {
    await service.updateUserStatus('lecturer', UserStatus.SUSPENDED, 'owner');
    expect(tx.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: UserStatus.SUSPENDED, tokenVersion: { increment: 1 } } }));
    expect(tx.lecturerProfile.updateMany).toHaveBeenCalledWith({ where: { userId: 'lecturer' }, data: { status: UserStatus.SUSPENDED } });
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actorId: 'owner', action: 'USER_STATUS_UPDATED' }) }));
  });

  it('does not report success when the transactional audit write fails', async () => {
    tx.auditLog.create.mockRejectedValue(new Error('Audit unavailable'));
    await expect(service.updateUserStatus('lecturer', UserStatus.SUSPENDED, 'owner')).rejects.toThrow('Audit unavailable');
  });

  it('rejects malformed user filters before querying the database', async () => {
    await expect(service.getUsers('OWNER')).rejects.toThrow('Invalid user role');
    await expect(service.getUsers(undefined, 'DELETED')).rejects.toThrow('Invalid user status');
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
});
