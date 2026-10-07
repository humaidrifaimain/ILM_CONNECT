import { Controller, Headers, HttpCode, Post, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { LivekitService } from './livekit.service';
import { StudentAttendanceService } from './student-attendance.service';

@Controller('livekit/webhook')
export class LivekitWebhookController {
  constructor(private readonly livekit: LivekitService, private readonly attendance: StudentAttendanceService) {}

  @Post()
  @HttpCode(200)
  async receive(@Req() request: Request & { rawBody?: Buffer }, @Headers('authorization') authorization?: string) {
    const body = request.rawBody || (Buffer.isBuffer(request.body) ? request.body : undefined);
    if (!body || !authorization) throw new UnauthorizedException('A signed LiveKit webhook is required');
    let event;
    try { event = await this.livekit.receiveWebhook(body.toString('utf8'), authorization); }
    catch { throw new UnauthorizedException('Invalid LiveKit webhook signature'); }
    await this.attendance.webhook(event);
    return { received: true };
  }
}
