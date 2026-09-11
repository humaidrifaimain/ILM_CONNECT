import { Controller, Post, Get, Body, Req, UseGuards, Patch, Param, Query } from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('support')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('request')
  async createTicket(@Req() req: any, @Body() body: { type: string; reason?: string }) {
    return this.supportService.createSupportTicket(req.user.id, body.type, body.reason);
  }

  @Get('my-tickets')
  async getMyTickets(@Req() req: any) {
    return this.supportService.getMyTickets(req.user.id);
  }

  @Get('tickets')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async getAllTickets(@Query('status') status?: string, @Query('role') role?: string) {
    return this.supportService.getAllTickets(status, role);
  }

  @Get('tickets/:id')
  async getTicketById(@Param('id') id: string, @Req() req: any) {
    return this.supportService.getTicketById(id, req.user);
  }

  @Post('tickets/:id/messages')
  async addTicketMessage(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { message: string; newStatus?: string },
  ) {
    return this.supportService.addTicketMessage(id, req.user, body.message, body.newStatus);
  }

  @Patch('tickets/:id/status')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async updateTicketStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.supportService.updateTicketStatus(id, body.status);
  }
}
