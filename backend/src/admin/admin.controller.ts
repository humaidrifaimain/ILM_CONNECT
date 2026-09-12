import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateLecturerDto, AssignLecturerDto } from './dto/create-lecturer.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  getUsers(@Query('role') role?: string, @Query('status') status?: string) {
    return this.adminService.getUsers(role, status);
  }

  @Post('lecturers')
  createLecturer(@Req() req: any, @Body() dto: CreateLecturerDto) {
    return this.adminService.createLecturer(dto, req.user?.id);
  }

  @Post('students/:id/assign-lecturer')
  assignLecturer(@Req() req: any, @Param('id') id: string, @Body() dto: AssignLecturerDto) {
    return this.adminService.assignLecturer(id, dto.lecturerId, req.user?.id);
  }

  @Patch('students/:id/assign-lecturer')
  assignLecturerPatch(@Req() req: any, @Param('id') id: string, @Body() dto: AssignLecturerDto) {
    return this.adminService.assignLecturer(id, dto.lecturerId, req.user?.id);
  }

  @Patch('lecturers/:id')
  updateLecturer(@Param('id') id: string, @Body() dto: any) {
    return this.adminService.updateLecturer(id, dto);
  }

  @Patch('users/:id/status')
  updateUserStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.adminService.updateUserStatus(id, status);
  }

  @Get('sessions')
  getSessions() {
    return this.adminService.getSessions();
  }

  @Get('finance')
  getFinanceOverview() {
    return this.adminService.getFinanceOverview();
  }

  @Get('audit-logs')
  getAuditLogs() {
    return this.adminService.getAuditLogs();
  }

  @Patch('payouts/:id/status')
  updatePayoutStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.adminService.updatePayoutStatus(id, status);
  }
}
