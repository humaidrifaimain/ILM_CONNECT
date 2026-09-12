import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('feedbacks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @Roles(Role.STUDENT)
  submitFeedback(
    @Request() req: any,
    @Body('sessionId') sessionId: string,
    @Body('score') score: number,
    @Body('comment') comment: string,
  ) {
    return this.feedbackService.submitFeedback(req.user.id, sessionId, score, comment);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  getAllFeedbacks() {
    return this.feedbackService.getAllFeedbacks();
  }

  @Get('lecturer/:id')
  @Roles(Role.LECTURER, Role.ADMIN, Role.SUPER_ADMIN)
  getLecturerFeedbacks(@Param('id') id: string) {
    return this.feedbackService.getLecturerFeedbacks(id);
  }
}
