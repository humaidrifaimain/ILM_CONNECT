import { Controller, Get, Post, UseGuards, Req, Body } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('progress')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('student')
  @Roles(Role.STUDENT)
  async getStudentProgress(@Req() req: any) {
    return this.progressService.getStudentProgress(req.user.id);
  }

  @Post('advance')
  @Roles(Role.LECTURER, Role.ADMIN, Role.SUPER_ADMIN)
  async advanceProgress(@Req() req: any, @Body('studentId') studentId: string) {
    return this.progressService.advanceProgress(studentId, req.user);
  }

  @Get('assessments')
  @Roles(Role.STUDENT)
  getAssessments(@Req() req: any) { return this.progressService.getAssessments(req.user.id); }

  @Post('assessments')
  @Roles(Role.LECTURER, Role.ADMIN, Role.SUPER_ADMIN)
  recordAssessment(@Req() req: any, @Body() body: { studentId: string; title: string; score: number; feedback: string }) { return this.progressService.recordAssessment(req.user, body); }

  @Get('certificates')
  @Roles(Role.STUDENT)
  async getCertificates(@Req() req: any) {
    return this.progressService.getCertificates(req.user.id);
  }
}
