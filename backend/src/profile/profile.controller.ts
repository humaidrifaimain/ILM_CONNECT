import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('profile')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('student')
  @Roles(Role.STUDENT)
  async getStudent(@Req() req: any) {
    return this.profileService.getStudentProfile(req.user.id);
  }

  @Put('student')
  @Roles(Role.STUDENT)
  async updateStudent(@Req() req: any, @Body() data: any) {
    return this.profileService.updateStudentProfile(req.user.id, data);
  }

  @Get('lecturer')
  @Roles(Role.LECTURER)
  async getLecturer(@Req() req: any) {
    return this.profileService.getLecturerProfile(req.user.id);
  }

  @Put('lecturer')
  @Roles(Role.LECTURER)
  async updateLecturer(@Req() req: any, @Body() data: any) {
    return this.profileService.updateLecturerProfile(req.user.id, data);
  }

  @Get('lecturers')
  @Roles(Role.STUDENT, Role.ADMIN, Role.SUPER_ADMIN)
  async getLecturers() {
    return this.profileService.getAllLecturers();
  }

  @Get('lecturer/students')
  @Roles(Role.LECTURER)
  async getMyStudents(@Req() req: any) {
    return this.profileService.getMyStudents(req.user.id);
  }
}

