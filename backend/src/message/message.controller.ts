import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { MessageService } from './message.service';
import { PresenceService } from './presence.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly presenceService: PresenceService,
  ) {}

  /** GET /messages/unread-count — total unread messages for the current user */
  @Get('unread-count')
  getUnreadCount(@Request() req: any) {
    return this.messageService.getUnreadCount(req.user.id);
  }

  /** GET /messages/threads — all threads with metadata & presence */
  @Get('threads')
  getThreads(@Request() req: any) {
    return this.messageService.getThreads(req.user.id);
  }

  /** POST /messages/presence/ping — heartbeat ping from active client */
  @Post('presence/ping')
  @HttpCode(HttpStatus.OK)
  pingPresence(@Request() req: any) {
    return this.presenceService.recordActivity(req.user.id);
  }

  /** POST /messages/presence/offline — beacon when client closes or leaves tab */
  @Post('presence/offline')
  @HttpCode(HttpStatus.OK)
  setOffline(@Request() req: any) {
    return this.presenceService.setOffline(req.user.id);
  }

  /** GET /messages/presence — batch presence check via ?userIds=id1,id2 */
  @Get('presence')
  getMultiplePresence(@Query('userIds') userIds?: string) {
    const ids = userIds ? userIds.split(',').map((id) => id.trim()).filter(Boolean) : [];
    return this.presenceService.getMultiplePresence(ids);
  }

  /** GET /messages/presence/:userId — single user presence check */
  @Get('presence/:userId')
  getUserPresence(@Param('userId') userId: string) {
    return this.presenceService.getPresence(userId);
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


