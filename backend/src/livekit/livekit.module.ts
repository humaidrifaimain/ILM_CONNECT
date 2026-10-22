import { Module } from '@nestjs/common';
import { LivekitService } from './livekit.service';
import { LivekitController } from './livekit.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { MeetingClockService } from './meeting-clock.service';
import { BookingModule } from '../booking/booking.module';
import { StudentAttendanceService } from './student-attendance.service';
import { LivekitWebhookController } from './livekit-webhook.controller';

@Module({
  imports: [PrismaModule, NotificationModule, BookingModule],
  controllers: [LivekitController, LivekitWebhookController],
  providers: [LivekitService, MeetingClockService, StudentAttendanceService],
  exports: [LivekitService],
})
export class LivekitModule {}
