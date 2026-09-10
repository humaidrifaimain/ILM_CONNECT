import { Controller, Get, Patch, Param, Sse, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Observable } from 'rxjs';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /** SSE Stream for real-time notification push to clients */
  @Sse('stream')
  streamNotifications(@Request() req: any): Observable<{ data: any }> {
    return this.notificationService.getNotificationStream(req.user.id);
  }

  /** GET /notifications — all notifications for current user */
  @Get()
  getMyNotifications(@Request() req: any) {
    return this.notificationService.getMyNotifications(req.user.id);
  }

  /** GET /notifications/unread-count — count of unread notifications */
  @Get('unread-count')
  getUnreadCount(@Request() req: any) {
    return this.notificationService.getUnreadCount(req.user.id);
  }

  /** PATCH /notifications/mark-all-read — mark all as read */
  @Patch('mark-all-read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAllRead(@Request() req: any) {
    return this.notificationService.markAllRead(req.user.id);
  }

  /** PATCH /notifications/:id/read — mark a single notification as read */
  @Patch(':id/read')
  markAsRead(@Request() req: any, @Param('id') id: string) {
    return this.notificationService.markAsRead(req.user.id, id);
  }
}
