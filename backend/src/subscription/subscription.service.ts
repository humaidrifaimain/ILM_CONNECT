import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

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

  async createSubscriptionIntent(studentId: string, tier: string, lkrAmount: number) {
    // This is a placeholder for actual payment gateway integration
    // Typically, you would call Stripe or PayHere API to create an intent
    
    // Create a pending subscription record
    const subscription = await this.prisma.subscription.create({
      data: {
        studentId,
        tier,
        status: 'PAST_DUE', // Will become active after payment
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)), // 1 month from now
        lkrAmount,
        fxRateApplied: 1.0,
      },
    });

    return {
      clientSecret: 'pi_placeholder_secret', // Would come from Stripe
      subscriptionId: subscription.id,
    };
  }

  async createTrialSubscription(studentId: string) {
    // Check if they already have one
    const existing = await this.prisma.subscription.findFirst({
      where: { studentId, tier: 'Trial' },
    });

    if (existing) {
      throw new BadRequestException('You have already claimed a free trial.');
    }

    const subscription = await this.prisma.subscription.create({
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
  }

  async handleWebhook(payload: any, signature: string) {
    // Placeholder for verifying and handling Stripe/PayHere webhooks
    // Update Subscription and Payment models based on event type
    console.log('Received webhook:', payload);
    return { received: true };
  }
}
