import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Subscription access', () => {
  const prisma = { subscription: { findMany: jest.fn() } };
  const service = new SubscriptionService(prisma as unknown as PrismaService);
  const trial = { tier: 'Trial', status: 'ACTIVE', currentPeriodStart: new Date(Date.now() - 86400000), currentPeriodEnd: new Date(Date.now() - 1000) };
  const paid = { ...trial, tier: 'Standard', currentPeriodEnd: new Date(Date.now() + 86400000) };
  beforeEach(() => jest.resetAllMocks());
  it('blocks an expired trial even if its stored status is ACTIVE', async () => {
    prisma.subscription.findMany.mockResolvedValue([trial]);
    await expect(service.getAccess('student-1')).resolves.toEqual({ requiresSubscription: true });
    expect(prisma.subscription.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId: 'student-1' } }));
  });
  it('unlocks only with a current active paid subscription after trial expiry', async () => {
    prisma.subscription.findMany.mockResolvedValue([trial, paid]);
    await expect(service.getAccess('student-1')).resolves.toEqual({ requiresSubscription: false });
  });
  it.each(['PAST_DUE', 'CANCELED'])('does not unlock for %s payment status', async status => {
    prisma.subscription.findMany.mockResolvedValue([trial, { ...paid, status }]);
    await expect(service.getAccess('student-1')).resolves.toEqual({ requiresSubscription: true });
  });
  it('does not unlock for an expired or future paid subscription', async () => {
    prisma.subscription.findMany.mockResolvedValue([trial, { ...paid, currentPeriodEnd: trial.currentPeriodEnd }, { ...paid, currentPeriodStart: new Date(Date.now() + 3600000) }]);
    await expect(service.getAccess('student-1')).resolves.toEqual({ requiresSubscription: true });
  });
  it('allows an unexpired trial and new students to continue their onboarding', async () => {
    prisma.subscription.findMany.mockResolvedValue([{ ...trial, currentPeriodEnd: paid.currentPeriodEnd }]);
    await expect(service.getAccess('student-1')).resolves.toEqual({ requiresSubscription: false });
    prisma.subscription.findMany.mockResolvedValue([]);
    await expect(service.getAccess('student-1')).resolves.toEqual({ requiresSubscription: false });
  });
  it('blocks an expired paid account with no previous trial', async () => {
    prisma.subscription.findMany.mockResolvedValue([{ ...trial, tier: 'Standard' }]);
    await expect(service.getAccess('student-1')).resolves.toEqual({ requiresSubscription: true });
  });
});

describe('Plan price configuration', () => {
  const plans = ['one', 'two', 'three'].flatMap(courseId => [
    { id: `${courseId}-standard`, courseId, tier: 'Standard', monthlyUsd: 59, monthlyLkr: 5000 },
    { id: `${courseId}-fast-track`, courseId, tier: 'Fast Track', monthlyUsd: 89, monthlyLkr: 8000 },
  ]);
  const tx = { subscriptionPlan: { update: jest.fn() }, auditLog: { create: jest.fn() } };
  const prisma = { subscriptionPlan: { findMany: jest.fn() }, $transaction: jest.fn() };
  const service = new SubscriptionService(prisma as unknown as PrismaService);
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.subscriptionPlan.findMany.mockResolvedValue(plans);
    prisma.$transaction.mockImplementation(fn => fn(tx));
  });
  it('saves all prices atomically and records the admin action', async () => {
    await service.updatePlans(plans.map(plan => ({ id: plan.id, monthlyLkr: plan.monthlyLkr, monthlyUsd: plan.monthlyUsd + 1 })), 'admin');
    expect(tx.subscriptionPlan.update).toHaveBeenCalledTimes(6);
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actorId: 'admin', action: 'PRICING_UPDATED' }) }));
  });
  it.each([0, -1, NaN, 12.345, 10001])('rejects invalid price %s without saving', async monthlyUsd => {
    await expect(service.updatePlans(plans.map((plan, i) => ({ id: plan.id, monthlyLkr: plan.monthlyLkr, monthlyUsd: i === 0 ? monthlyUsd : plan.monthlyUsd })), 'admin')).rejects.toThrow();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it.each([0, -1, NaN, 12.345, 10000001, undefined])('rejects invalid local price %s', async monthlyLkr => {
    await expect(service.updatePlans(plans.map((plan, i) => ({ ...plan, monthlyLkr: i === 0 ? monthlyLkr : plan.monthlyLkr })), 'admin')).rejects.toThrow();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('rejects local Fast Track below Standard independently of USD', async () => {
    await expect(service.updatePlans(plans.map(plan => ({ ...plan, monthlyLkr: plan.tier === 'Fast Track' ? 100 : 5000 })), 'admin')).rejects.toThrow();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('rejects duplicate plan IDs and incomplete updates', async () => {
    await expect(service.updatePlans(plans.map(() => ({ id: plans[0].id, monthlyUsd: 59 })), 'admin')).rejects.toThrow();
    await expect(service.updatePlans([], 'admin')).rejects.toThrow();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('rejects Fast Track pricing below Standard', async () => {
    await expect(service.updatePlans(plans.map(plan => ({ id: plan.id, monthlyLkr: plan.monthlyLkr, monthlyUsd: plan.tier === 'Fast Track' ? 10 : 59 })), 'admin')).rejects.toThrow();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('Automatic verified gateway confirmation', () => {
  const subscription = { id: 'subscription', tier: 'Standard', status: 'PAST_DUE', currentPeriodStart: new Date(Date.now() - 1000), currentPeriodEnd: new Date(Date.now() + 86400000) };
  const payment = { id: 'payment', gateway: 'future-provider', gatewayChargeId: 'charge', amountLkr: 20000, status: 'PENDING', subscription };
  const confirmation = { paymentId: payment.id, gateway: payment.gateway, gatewayChargeId: payment.gatewayChargeId, amountLkr: 20000, currency: 'LKR', status: 'SUCCESSFUL' as const };
  const tx = { payment: { findUnique: jest.fn(), updateMany: jest.fn() }, subscription: { update: jest.fn() } };
  const prisma = { $transaction: jest.fn() };
  const service = new SubscriptionService(prisma as unknown as PrismaService);
  beforeEach(() => { jest.resetAllMocks(); prisma.$transaction.mockImplementation(fn => fn(tx)); tx.payment.findUnique.mockResolvedValue(payment); tx.payment.updateMany.mockResolvedValue({ count: 1 }); });
  it('activates paid access immediately without admin approval', async () => {
    await service.recordVerifiedGatewayPayment(confirmation);
    expect(tx.subscription.update).toHaveBeenCalledWith({ where: { id: 'subscription' }, data: { status: 'ACTIVE' } });
  });
  it('does not activate a failed payment', async () => {
    await service.recordVerifiedGatewayPayment({ ...confirmation, status: 'FAILED' });
    expect(tx.subscription.update).not.toHaveBeenCalled();
  });
  it('acknowledges duplicate success without activating or extending again', async () => {
    tx.payment.findUnique.mockResolvedValue({ ...payment, status: 'SUCCESSFUL' });
    await service.recordVerifiedGatewayPayment(confirmation);
    expect(tx.payment.updateMany).not.toHaveBeenCalled(); expect(tx.subscription.update).not.toHaveBeenCalled();
  });
  it.each([{ amountLkr: 1 }, { currency: 'USD' }, { gatewayChargeId: 'other' }, { gateway: 'other' }])('rejects mismatched confirmations %j', async mismatch => {
    await expect(service.recordVerifiedGatewayPayment({ ...confirmation, ...mismatch })).rejects.toThrow();
    expect(tx.subscription.update).not.toHaveBeenCalled();
  });
  it('does not grant access when another callback wins the update', async () => {
    tx.payment.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.recordVerifiedGatewayPayment(confirmation)).rejects.toThrow();
    expect(tx.subscription.update).not.toHaveBeenCalled();
  });
});
