import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CurriculumService } from './curriculum.service';
import { CreateCourseAssessmentDto } from './course-assessment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import {
  CreateCourseRequestDto,
  ReviewCourseRequestDto,
} from './course-request.dto';

@Controller('curriculum')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CurriculumController {
  constructor(private readonly curriculumService: CurriculumService) {}

  @Get('requests')
  @Roles(Role.STUDENT, Role.LECTURER)
  getRequests(@Request() req: any) {
    return this.curriculumService.getRequests(req.user.id, req.user.role);
  }

  @Post('requests')
  @Roles(Role.STUDENT)
  requestCourse(@Request() req: any, @Body() body: CreateCourseRequestDto) {
    return this.curriculumService.requestCourse(
      req.user.id,
      body.learningPathId,
    );
  }

  @Patch('requests/:id')
  @Roles(Role.LECTURER)
  reviewRequest(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReviewCourseRequestDto,
  ) {
    return this.curriculumService.reviewRequest(req.user.id, id, body.status);
  }

  @Get('paths')
  async getAllPaths() {
    return this.curriculumService.getAllPaths();
  }

  @Get('paths/:id')
  async getPath(@Param('id') id: string) {
    return this.curriculumService.getPath(id);
  }

  @Get('paths/:id/assessments')
  @Roles(Role.LECTURER)
  getAssessments(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.curriculumService.getAssessments(req.user.id, id);
  }

  @Post('paths/:id/assessments')
  @Roles(Role.LECTURER)
  createAssessment(@Request() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() body: CreateCourseAssessmentDto) {
    return this.curriculumService.createAssessment(req.user.id, id, body);
  }
}
