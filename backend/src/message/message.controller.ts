import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { MessageService } from './message.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  /** GET /messages/unread-count — total unread messages for the current user */
  @Get('unread-count')
  getUnreadCount(@Request() req: any) {
    return this.messageService.getUnreadCount(req.user.id);
  }

  /** GET /messages/threads — all threads with metadata */
  @Get('threads')
  getThreads(@Request() req: any) {
    return this.messageService.getThreads(req.user.id);
  }

  /** GET /messages/:threadId — all messages in a thread */
  @Get(':threadId')
  getMessagesInThread(@Request() req: any, @Param('threadId') threadId: string) {
    return this.messageService.getMessagesInThread(req.user.id, threadId);
  }

  /** PATCH /messages/:threadId/read — mark all messages in thread as read */
  @Patch(':threadId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markThreadAsRead(@Request() req: any, @Param('threadId') threadId: string) {
    return this.messageService.markThreadAsRead(req.user.id, threadId);
  }

  /** POST /messages — send a message */
  @Post()
  sendMessage(
    @Request() req: any,
    @Body('recipientId') recipientId: string,
    @Body('content') content: string,
    @Body('threadId') threadId?: string,
  ) {
    return this.messageService.sendMessage(req.user.id, recipientId, content, threadId);
  }
}

