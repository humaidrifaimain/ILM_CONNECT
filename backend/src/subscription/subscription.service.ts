import { Injectable, NotFoundException, BadRequestException, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  async getCurrencies() {
    return this.prisma.pricingCurrency.findMany({ orderBy: { region: 'asc' } });
  }

  async updateCurrencies(input: unknown, actorId: string) {
    if (!Array.isArray(input) || input.length !== 5 || new Set(input.map(row => row?.code)).size !== 5) throw new BadRequestException('Provide all five currencies');
    const codes = ['LKR', 'USD', 'GBP', 'EUR', 'AUD'];
    for (const row of input) {
      if (!codes.includes(row?.code) || typeof row.lkrPerUnit !== 'number' || !Number.isFinite(row.lkrPerUnit) || row.lkrPerUnit <= 0 || row.lkrPerUnit > 1000000 || (row.code === 'LKR' && row.lkrPerUnit !== 1) || typeof row.rateDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.rateDate) || (!Number.isFinite(Date.parse(row.rateDate)) || new Date(row.rateDate).toISOString().slice(0, 10) !== row.rateDate)) throw new BadRequestException('Invalid currency rate or date. LKR must remain 1.');
    }
    await this.prisma.$transaction(async tx => {
      for (const row of input) await tx.pricingCurrency.update({ where: { code: row.code }, data: { lkrPerUnit: row.lkrPerUnit, rateDate: row.rateDate } });
      await tx.auditLog.create({ data: { actorId, action: 'CURRENCY_RATES_UPDATED', entity: 'PRICING_CURRENCIES', entityId: 'catalog', details: { rates: input } } });
    });
    return this.getCurrencies();
  }

  async getPlans() {
    return this.prisma.subscriptionPlan.findMany({ orderBy: [{ courseId: 'asc' }, { sessions: 'asc' }] });
  }

  async updatePlans(input: unknown, actorId: string) {
    if (!Array.isArray(input) || input.length !== 6) throw new BadRequestException('Provide prices for all six plans');
    const updates: { id: string; monthlyUsd: number }[] = [];
    for (const row of input) {
      if (!row || typeof row.id !== 'string' || typeof row.monthlyUsd !== 'number' || !Number.isFinite(row.monthlyUsd) || row.monthlyUsd <= 0 || row.monthlyUsd > 10000 || Math.abs(row.monthlyUsd * 100 - Math.round(row.monthlyUsd * 100)) > 0.000001) {
        throw new BadRequestException('Prices must be positive amounts with at most two decimal places');
      }
      updates.push({ id: row.id, monthlyUsd: row.monthlyUsd });
    }
    const current = await this.getPlans();
    if (new Set(updates.map(row => row.id)).size !== current.length || updates.some(row => !current.some(plan => plan.id === row.id))) throw new BadRequestException('Unknown or duplicate plan');
    for (const standard of current.filter(plan => plan.tier === 'Standard')) {
      const fastTrack = current.find(plan => plan.courseId === standard.courseId && plan.tier === 'Fast Track')!;
      if (updates.find(row => row.id === fastTrack.id)!.monthlyUsd < updates.find(row => row.id === standard.id)!.monthlyUsd) throw new BadRequestException('Fast Track must cost at least as much as Standard');
    }
    await this.prisma.$transaction(async tx => {
      for (const row of updates) await tx.subscriptionPlan.update({ where: { id: row.id }, data: { monthlyUsd: row.monthlyUsd } });
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
