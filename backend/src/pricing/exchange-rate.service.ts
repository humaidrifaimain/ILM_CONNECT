import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const REFRESH_MS = 5 * 60 * 1000;
const regions: Record<string, string> = { LKR: 'Sri Lanka', USD: 'International', GBP: 'United Kingdom', EUR: 'Europe', AUD: 'Australia' };

@Injectable()
export class ExchangeRateService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExchangeRateService.name);
  private timer?: ReturnType<typeof setInterval>;
  private pending?: Promise<void>;
  private nextAttempt = 0;
  private failed = false;
  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    void this.refresh();
    this.timer = setInterval(() => void this.refresh(), REFRESH_MS);
    this.timer.unref();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  async refresh() {
    if (this.pending) return this.pending;
    if (Date.now() < this.nextAttempt) return;
    this.nextAttempt = Date.now() + REFRESH_MS;
    this.pending = this.fetchRates().finally(() => { this.pending = undefined; });
    return this.pending;
  }

  private async fetchRates() {
    try {
      const response = await fetch('https://api.frankfurter.dev/v2/rates?base=USD&quotes=LKR,GBP,EUR,AUD', { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Exchange provider unavailable');
      const rows: unknown = await response.json();
      if (!Array.isArray(rows) || rows.length !== 4) throw new Error('Incomplete exchange response');
      const checked = rows as { base: string; quote: string; date: string; rate: number }[];
      for (const quote of ['LKR', 'GBP', 'EUR', 'AUD']) {
        const matches = checked.filter(row => row.quote === quote);
        const row = matches[0];
        if (matches.length !== 1 || row.base !== 'USD' || !Number.isFinite(row.rate) || row.rate <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !Number.isFinite(Date.parse(row.date)) || new Date(row.date).toISOString().slice(0, 10) !== row.date || Date.parse(row.date) > Date.now() || Date.now() - Date.parse(row.date) > 7 * 86400000) throw new Error('Invalid exchange response');
      }
      const lkr = checked.find(row => row.quote === 'LKR')!;
      const fetchedAt = new Date();
      await this.prisma.$transaction(async tx => {
        // One lock prevents older requests from replacing a newer snapshot across servers.
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('pricing-exchange-rates'))::text`;
        const current = await tx.pricingCurrency.findUnique({ where: { code: 'USD' } });
        if (current?.fetchedAt && current.fetchedAt > fetchedAt) return;
        if (current?.source && current.rateDate > lkr.date) throw new Error('Exchange provider returned an older rate');
        for (const code of Object.keys(regions)) {
          const row = checked.find(item => item.quote === code);
          const rateDate = row && row.date < lkr.date ? row.date : lkr.date;
          const lkrPerUnit = code === 'LKR' ? 1 : code === 'USD' ? lkr.rate : lkr.rate / row!.rate;
          if (!Number.isFinite(lkrPerUnit) || lkrPerUnit <= 0 || lkrPerUnit > 1000000) throw new Error('Invalid calculated exchange rate');
          const data = { region: regions[code], lkrPerUnit, rateDate, source: 'Frankfurter daily reference', fetchedAt };
          await tx.pricingCurrency.upsert({ where: { code }, create: { code, ...data }, update: data });
        }
      });
      this.failed = false;
    } catch {
      this.failed = true;
      this.logger.warn('Exchange refresh failed; retaining the last verified snapshot');
    }
  }

  async snapshot() {
    await this.refresh();
    const rows = await this.prisma.pricingCurrency.findMany({ orderBy: { region: 'asc' } });
    return rows.map(row => ({ ...row, available: row.code === 'LKR' || !!row.source && !!row.fetchedAt, stale: row.code !== 'LKR' && (!row.fetchedAt || this.failed || Date.now() - row.fetchedAt.getTime() > 2 * REFRESH_MS || Date.now() - Date.parse(row.rateDate) > 4 * 86400000) }));
  }
}
