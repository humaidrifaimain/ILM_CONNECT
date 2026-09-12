import { Controller, Get, Post, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { CreateSlotDto } from './dto/availability.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('availability')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  @Roles(Role.LECTURER, Role.ADMIN, Role.SUPER_ADMIN)
  async getMySlots(@Req() req: any) {
    return this.availabilityService.getLecturerSlots(req.user.id);
  }

  @Get(':lecturerId')
  @Roles(Role.STUDENT, Role.LECTURER, Role.ADMIN, Role.SUPER_ADMIN)
  async getLecturerSlots(@Param('lecturerId') lecturerId: string) {
    return this.availabilityService.getLecturerSlots(lecturerId);
  }

  @Post()
  @Roles(Role.LECTURER, Role.ADMIN, Role.SUPER_ADMIN)
  async createSlot(@Req() req: any, @Body() dto: CreateSlotDto) {
    const isAdmin = req.user.role === Role.ADMIN || req.user.role === Role.SUPER_ADMIN;
    const targetLecturerId = isAdmin && dto.lecturerId ? dto.lecturerId : req.user.id;
    return this.availabilityService.createSlot(targetLecturerId, dto);
  }

  @Delete(':slotId')
  @Roles(Role.LECTURER, Role.ADMIN, Role.SUPER_ADMIN)
  async deleteSlot(@Req() req: any, @Param('slotId') slotId: string) {
    const isAdmin = req.user.role === Role.ADMIN || req.user.role === Role.SUPER_ADMIN;
    return this.availabilityService.deleteSlot(req.user.id, slotId, isAdmin);
  }
}
