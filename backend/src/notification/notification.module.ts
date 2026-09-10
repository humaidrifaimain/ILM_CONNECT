import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { EmailNotificationService } from './email-notification.service';
import { WhatsAppNotificationService } from './whatsapp-notification.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    EmailNotificationService,
    WhatsAppNotificationService,
  ],
  exports: [
    NotificationService,
    EmailNotificationService,
    WhatsAppNotificationService,
  ],
})
export class NotificationModule {}
