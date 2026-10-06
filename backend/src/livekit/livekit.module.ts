import { Module } from '@nestjs/common';
import { LivekitService } from './livekit.service';
import { LivekitController } from './livekit.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { MeetingClockService } from './meeting-clock.service';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [LivekitController],
  providers: [LivekitService, MeetingClockService],
  exports: [LivekitService],
})
export class LivekitModule {}
