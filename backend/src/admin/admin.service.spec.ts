import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';

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
