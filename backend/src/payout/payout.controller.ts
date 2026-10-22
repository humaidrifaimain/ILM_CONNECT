import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { PayoutService } from './payout.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.LECTURER)
export class PayoutController {
  constructor(private readonly payoutService: PayoutService) {}

  @Get('balance')
  getBalance(@Request() req: any) { return this.payoutService.getBalance(req.user.id); }

  @Get('me')
  getMyPayouts(@Request() req: any) {
    return this.payoutService.getMyPayouts(req.user.id);
  }

  @Post('request')
  requestPayout(
    @Request() req: any,
    @Body('amountLkr') amountLkr: number,
    @Body('method') method: string,
  ) {
    return this.payoutService.requestPayout(req.user.id, amountLkr, method);
  }
}
