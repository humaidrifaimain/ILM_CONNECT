import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role, UserStatus } from '@prisma/client';

describe('Finance overview', () => {
  const prisma = { payment: { findMany: jest.fn() }, payout: { findMany: jest.fn() } };
  const service = new AdminService(prisma as unknown as PrismaService);
  beforeEach(() => jest.resetAllMocks());
  it('returns an empty breakdown when no successful payments exist', async () => {
    prisma.payment.findMany.mockResolvedValue([]);
    prisma.payout.findMany.mockResolvedValue([]);
    await expect(service.getFinanceOverview()).resolves.toEqual({ payments: [], payouts: [], revenueByPlan: [] });
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
