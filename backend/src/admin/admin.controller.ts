import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req, Header } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateLecturerDto, AssignLecturerDto, UpdateLecturerDto, UpdateUserStatusDto } from './dto/create-lecturer.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('waitlist')
  @Header('Cache-Control', 'no-store')
  getWaitlist() { return this.adminService.getWaitlist(); }

  @Get('stats')
  @Header('Cache-Control', 'no-store')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  @Header('Cache-Control', 'no-store')
  getUsers(@Query('role') role?: string, @Query('status') status?: string) {
    return this.adminService.getUsers(role, status);
  }

  @Post('lecturers')
  createLecturer(@Req() req: any, @Body() dto: CreateLecturerDto) {
    return this.adminService.createLecturer(dto, req.user?.id);
  }

  @Post('requests/:id/assign-lecturer')
  assignLecturer(@Req() req: any, @Param('id') id: string, @Body() dto: AssignLecturerDto) {
    return this.adminService.assignLecturerForRequest(id, dto.lecturerId, req.user.id);
  }

  @Patch('lecturers/:id')
  updateLecturer(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateLecturerDto) {
    return this.adminService.updateLecturer(id, dto, req.user.id);
  }

  @Patch('users/:id/status')
  updateUserStatus(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.adminService.updateUserStatus(id, dto.status, req.user.id);
  }

  @Get('sessions')
  @Header('Cache-Control', 'no-store')
  getSessions() {
    return this.adminService.getSessions();
  }

  @Get('finance')
  @Header('Cache-Control', 'no-store')
  getFinanceOverview() {
    return this.adminService.getFinanceOverview();
  }

  @Get('feedback')
  @Header('Cache-Control', 'no-store')
  getFeedback() { return this.adminService.getFeedback(); }

  @Get('audit-logs')
  @Header('Cache-Control', 'no-store')
  getAuditLogs() {
    return this.adminService.getAuditLogs();
  }

  @Patch('payouts/:id/status')
  updatePayoutStatus(@Req() req: any, @Param('id') id: string, @Body('status') status: string) {
    return this.adminService.updatePayoutStatus(id, status, req.user.id);
  }
}
