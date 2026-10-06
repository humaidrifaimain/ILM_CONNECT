import { Injectable, NotFoundException, BadRequestException, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExchangeRateService } from '../pricing/exchange-rate.service';

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService, private exchange?: ExchangeRateService) {}

  async getCurrencies() {
    return this.exchange!.snapshot();
  }

  async getPlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({ orderBy: [{ courseId: 'asc' }, { sessions: 'asc' }] });
    if (!this.exchange) return plans;
    const rates = await this.exchange.snapshot();
    const usd = rates.find(row => row.code === 'USD');
    return plans.map(plan => {
      const prices: Record<string, number | null> = { LKR: plan.monthlyLkr, USD: plan.monthlyUsd };
      for (const code of ['GBP', 'EUR', 'AUD']) {
        const rate = rates.find(row => row.code === code);
        prices[code] = usd?.available && !usd.stale && rate?.available && !rate.stale
          ? Math.round(plan.monthlyUsd * usd.lkrPerUnit / rate.lkrPerUnit * 100) / 100 : null;
      }
      return { ...plan, prices, internationalLkr: usd?.available && !usd.stale ? Math.round(plan.monthlyUsd * usd.lkrPerUnit * 100) / 100 : null };
    });
  }

  async updatePlans(input: unknown, actorId: string) {
    if (!Array.isArray(input) || input.length !== 6) throw new BadRequestException('Provide prices for all six plans');
    const updates: { id: string; monthlyUsd: number; monthlyLkr: number }[] = [];
    for (const row of input) {
      if (!row || typeof row.id !== 'string' || ![row.monthlyUsd, row.monthlyLkr].every(value => typeof value === 'number' && Number.isFinite(value) && value > 0 && Math.abs(value * 100 - Math.round(value * 100)) <= 0.000001) || row.monthlyUsd > 10000 || row.monthlyLkr > 10000000) {
        throw new BadRequestException('Prices must be positive amounts with at most two decimal places');
      }
      updates.push({ id: row.id, monthlyUsd: row.monthlyUsd, monthlyLkr: row.monthlyLkr });
    }
    const current = await this.getPlans();
    if (new Set(updates.map(row => row.id)).size !== current.length || updates.some(row => !current.some(plan => plan.id === row.id))) throw new BadRequestException('Unknown or duplicate plan');
    for (const standard of current.filter(plan => plan.tier === 'Standard')) {
      const fastTrack = current.find(plan => plan.courseId === standard.courseId && plan.tier === 'Fast Track')!;
      if (updates.find(row => row.id === fastTrack.id)!.monthlyUsd < updates.find(row => row.id === standard.id)!.monthlyUsd) throw new BadRequestException('Fast Track must cost at least as much as Standard');
      if (updates.find(row => row.id === fastTrack.id)!.monthlyLkr < updates.find(row => row.id === standard.id)!.monthlyLkr) throw new BadRequestException('Sri Lankan Fast Track must cost at least as much as Standard');
    }
    await this.prisma.$transaction(async tx => {
      for (const row of updates) await tx.subscriptionPlan.update({ where: { id: row.id }, data: { monthlyUsd: row.monthlyUsd, monthlyLkr: row.monthlyLkr } });
      await tx.auditLog.create({ data: { actorId, action: 'PRICING_UPDATED', entity: 'SUBSCRIPTION_PLANS', entityId: 'catalog', details: { prices: updates } } });
    });
    return this.getPlans();
  }

  async getAccess(studentId: string) {
    const subscriptions = await this.prisma.subscription.findMany({
      where: { studentId },
      select: { tier: true, status: true, currentPeriodStart: true, currentPeriodEnd: true },
    });
    const now = new Date();
    const active = subscriptions.some(subscription => subscription.status === 'ACTIVE' && subscription.currentPeriodStart <= now && subscription.currentPeriodEnd > now);
    return { requiresSubscription: subscriptions.length > 0 && !active };
  }

  async getMySubscription(studentId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { studentId, status: 'ACTIVE' },
      orderBy: { currentPeriodEnd: 'desc' },
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    return subscription;
  }

  async getPaymentHistory(studentId: string) {
    return this.prisma.payment.findMany({ where: { subscription: { studentId } }, include: { subscription: { select: { tier: true } } }, orderBy: { processedAt: 'desc' } });
  }

  async createSubscriptionIntent(studentId: string, tier: string, lkrAmount: number) {
    throw new NotImplementedException('Payment checkout will be available when the payment gateway is connected.');
  }

  async createTrialSubscription(studentId: string) {
    return this.prisma.$transaction(async tx => {
    // Database locking keeps claims single-use across API instances.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`trial:${studentId}`}))::text`;
    const existing = await tx.subscription.findFirst({
      where: { studentId, tier: { equals: 'Trial', mode: 'insensitive' } },
    });

    if (existing) {
      throw new BadRequestException('You have already claimed a free trial.');
    }

    const subscription = await tx.subscription.create({
      data: {
        studentId,
        tier: 'Trial',
        status: 'ACTIVE', 
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(new Date().setDate(new Date().getDate() + 7)), // 7 days from now
        lkrAmount: 0,
        fxRateApplied: 1.0,
      },
    });

    return subscription;
    }, { maxWait: 10000, timeout: 15000 });
  }

  async handleWebhook(payload: any, signature: string) {
    throw new NotImplementedException('Payment gateway is not connected.');
  }

  // Called only by a future gateway adapter AFTER signature verification and
  // provider confirmation. Never expose this as a client/admin approval route.
  async recordVerifiedGatewayPayment(confirmation: {
    paymentId: string; gateway: string; gatewayChargeId: string;
    currency: string; amountLkr: number; status: 'SUCCESSFUL' | 'FAILED';
  }) {
    if (confirmation.currency !== 'LKR' || !Number.isFinite(confirmation.amountLkr) || confirmation.amountLkr <= 0 || !['SUCCESSFUL', 'FAILED'].includes(confirmation.status)) {
      throw new BadRequestException('Invalid gateway payment confirmation');
    }
    return this.prisma.$transaction(async tx => {
      const payment = await tx.payment.findUnique({ where: { id: confirmation.paymentId }, include: { subscription: true } });
      if (!payment) throw new NotFoundException('Payment not found');
      if (payment.gateway !== confirmation.gateway || payment.gatewayChargeId !== confirmation.gatewayChargeId || Math.round(payment.amountLkr * 100) !== Math.round(confirmation.amountLkr * 100)) {
        throw new BadRequestException('Gateway confirmation does not match the recorded payment');
      }
      // Duplicate notifications are acknowledged without extending the term again.
      if (payment.status === confirmation.status) return { paymentId: payment.id, status: payment.status };
      if (payment.status !== 'PENDING' || payment.subscription.tier.toLowerCase() === 'trial') throw new BadRequestException('Payment is not awaiting confirmation');
      const changed = await tx.payment.updateMany({ where: { id: payment.id, status: 'PENDING' }, data: { status: confirmation.status, processedAt: new Date() } });
      if (changed.count !== 1) throw new BadRequestException('Payment confirmation is already being processed; retry');
      if (confirmation.status === 'SUCCESSFUL') {
        const subscription = payment.subscription;
        if (subscription.currentPeriodEnd <= subscription.currentPeriodStart || subscription.currentPeriodEnd <= new Date()) throw new BadRequestException('Invalid subscription period');
        await tx.subscription.update({ where: { id: subscription.id }, data: { status: 'ACTIVE' } });
      }
      return { paymentId: payment.id, status: confirmation.status };
    });
  }
}
