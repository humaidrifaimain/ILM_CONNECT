import { Controller, Get, Post, Body, UseGuards, Request, Headers } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  getMySubscription(@Request() req: any) {
    return this.subscriptionService.getMySubscription(req.user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  createSubscriptionIntent(
    @Request() req: any,
    @Body('tier') tier: string,
    @Body('lkrAmount') lkrAmount: number,
  ) {
    return this.subscriptionService.createSubscriptionIntent(req.user.id, tier, lkrAmount);
  }

  @Post('trial')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  createTrialSubscription(@Request() req: any) {
    return this.subscriptionService.createTrialSubscription(req.user.id);
  }

  // Webhook usually shouldn't be guarded by JWT, it uses its own signature validation
  @Post('../payments/webhook')
  handleWebhook(@Body() payload: any, @Headers('stripe-signature') signature: string) {
    return this.subscriptionService.handleWebhook(payload, signature);
  }
}
