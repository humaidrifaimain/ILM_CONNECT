import { ExchangeRateService } from './exchange-rate.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Automatic currency snapshots', () => {
  const tx = { $queryRaw: jest.fn(), pricingCurrency: { findUnique: jest.fn(), upsert: jest.fn() } };
  const prisma = { $transaction: jest.fn(), pricingCurrency: { findMany: jest.fn() } };
  const originalFetch = global.fetch;
  let service: ExchangeRateService;
  const date = new Date().toISOString().slice(0, 10);
  const rows = [{ quote: 'LKR', rate: 300 }, { quote: 'GBP', rate: .75 }, { quote: 'EUR', rate: .9 }, { quote: 'AUD', rate: 1.5 }].map(row => ({ ...row, date, base: 'USD' }));
  beforeEach(() => {
    jest.resetAllMocks();
    service = new ExchangeRateService(prisma as unknown as PrismaService);
    prisma.$transaction.mockImplementation(fn => fn(tx));
    prisma.pricingCurrency.findMany.mockResolvedValue([]);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => rows });
  });
  afterEach(() => { global.fetch = originalFetch; service.onModuleDestroy(); });
  it('persists one complete sourced snapshot and computes cross rates on the server', async () => {
    await service.refresh();
    expect(tx.pricingCurrency.upsert).toHaveBeenCalledTimes(5);
    expect(tx.pricingCurrency.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { code: 'GBP' }, update: expect.objectContaining({ lkrPerUnit: 400, rateDate: date, source: 'Frankfurter daily reference', fetchedAt: expect.any(Date) }) }));
    await service.refresh();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
  it('deduplicates simultaneous refreshes', async () => {
    await Promise.all([service.refresh(), service.refresh(), service.snapshot()]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
  it.each([[], rows.slice(1), rows.map(row => ({ ...row, rate: 0 })), rows.map(row => ({ ...row, date: '1999-01-01' })), rows.map(row => ({ ...row, date: '2099-01-01' }))].map(input => [input]))('retains the database snapshot for invalid responses', async input => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => input });
    await service.refresh();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('marks saved rates stale on failed refresh and never blesses unsourced manual rates', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('offline'));
    prisma.pricingCurrency.findMany.mockResolvedValue([{ code: 'USD', source: 'Frankfurter daily reference', fetchedAt: new Date(), rateDate: date }, { code: 'GBP', source: null, fetchedAt: null, rateDate: date }]);
    const snapshot = await service.snapshot();
    expect(snapshot[0]).toMatchObject({ available: true, stale: true });
    expect(snapshot[1]).toMatchObject({ available: false, stale: true });
  });
  it('does not overwrite a snapshot fetched later by another server', async () => {
    tx.pricingCurrency.findUnique.mockResolvedValue({ fetchedAt: new Date(Date.now() + 1000) });
    await service.refresh();
    expect(tx.pricingCurrency.upsert).not.toHaveBeenCalled();
  });
});

describe('Backend plan pricing', () => {
  const prisma = { subscriptionPlan: { findMany: jest.fn() } };
  const exchange = { snapshot: jest.fn() };
  const service = new SubscriptionService(prisma as unknown as PrismaService, exchange as unknown as ExchangeRateService);
  beforeEach(() => {
    prisma.subscriptionPlan.findMany.mockResolvedValue([{ id: 'plan', monthlyUsd: 60, monthlyLkr: 6000 }]);
    exchange.snapshot.mockResolvedValue([{ code: 'LKR', lkrPerUnit: 1, available: true, stale: false }, { code: 'USD', lkrPerUnit: 300, available: true, stale: false }, { code: 'GBP', lkrPerUnit: 400, available: true, stale: false }]);
  });
  it('uses the independent local price and converts international prices with a single snapshot', async () => {
    const [plan] = await service.getPlans();
    expect(plan).toMatchObject({ prices: { LKR: 6000, USD: 60, GBP: 45 }, internationalLkr: 18000 });
  });
  it('keeps direct local and USD prices available while hiding stale conversions', async () => {
    exchange.snapshot.mockResolvedValue([{ code: 'LKR', lkrPerUnit: 1, available: true }, { code: 'USD', lkrPerUnit: 300, available: true, stale: true }, { code: 'GBP', lkrPerUnit: 400, available: true }]);
    expect((await service.getPlans())[0]).toMatchObject({ prices: { LKR: 6000, USD: 60, GBP: null }, internationalLkr: null });
  });
  it('keeps configured prices available before the first provider snapshot', async () => {
    exchange.snapshot.mockResolvedValue([]);
    expect((await service.getPlans())[0]).toMatchObject({ prices: { LKR: 6000, USD: 60, GBP: null, EUR: null, AUD: null }, internationalLkr: null });
  });
});
