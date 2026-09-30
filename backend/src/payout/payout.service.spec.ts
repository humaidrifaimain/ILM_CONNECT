import { PayoutService } from './payout.service';
import { AdminService } from '../admin/admin.service';
describe('Available earnings and payout reservation', () => {
  const blocks = [{ id: 'one', payoutAmountLkr: 2500 }, { id: 'two', payoutAmountLkr: 2500 }];
  const tx = { $queryRaw: jest.fn(), sessionBlock: { findMany: jest.fn(), updateMany: jest.fn() }, payout: { create: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn() } };
  const prisma = { sessionBlock: tx.sessionBlock, $transaction: jest.fn() };
  const service = new PayoutService(prisma as any); const admin = new AdminService(prisma as any);
  beforeEach(() => { jest.resetAllMocks(); prisma.$transaction.mockImplementation(fn => fn(tx)); tx.sessionBlock.findMany.mockResolvedValue(blocks); tx.payout.create.mockResolvedValue({ id: 'request' }); });
  it('uses completed blocks as available balance, not pending payout requests', async () => {
    await expect(service.getBalance('lecturer')).resolves.toEqual({ availableLkr: 5000 });
    expect(tx.sessionBlock.findMany).toHaveBeenCalledWith({ where: { lecturerId: 'lecturer', status: 'COMPLETED' } });
  });
  it('reserves full completed blocks atomically so they cannot be requested again', async () => {
    await service.requestPayout('lecturer', 5000, 'bank_transfer');
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.sessionBlock.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['one', 'two'] }, lecturerId: 'lecturer', status: 'COMPLETED' }, data: { status: 'PENDING' } });
    tx.sessionBlock.findMany.mockResolvedValue([]);
    await expect(service.requestPayout('lecturer', 5000, 'bank_transfer')).rejects.toThrow('full available');
    expect(tx.payout.create).toHaveBeenCalledTimes(1);
  });
  it.each([0, -1, NaN, 2500])('rejects invalid or partial request %s', async amount => {
    await expect(service.requestPayout('lecturer', amount, 'bank_transfer')).rejects.toThrow();
    expect(tx.payout.create).not.toHaveBeenCalled();
  });
  it('returns reserved blocks to the available balance when payment fails', async () => {
    tx.payout.findUnique.mockResolvedValue({ lecturerId: 'lecturer', sessionBlocksIncluded: ['one'] }); tx.payout.updateMany.mockResolvedValue({ count: 1 });
    await admin.updatePayoutStatus('request', 'FAILED');
    expect(tx.sessionBlock.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['one'] }, lecturerId: 'lecturer' }, data: { status: 'COMPLETED' } });
  });
  it('prevents repeated processing of an already settled payout', async () => {
    tx.payout.findUnique.mockResolvedValue({ lecturerId: 'lecturer', sessionBlocksIncluded: ['one'] }); tx.payout.updateMany.mockResolvedValue({ count: 0 });
    await expect(admin.updatePayoutStatus('request', 'SUCCESSFUL')).rejects.toThrow('Only pending');
    expect(tx.sessionBlock.updateMany).not.toHaveBeenCalled();
  });
});
