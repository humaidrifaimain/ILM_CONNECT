import { Controller, Get, Post, Delete, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @Roles(Role.STUDENT)
  async createBooking(@Req() req: any, @Body() dto: CreateBookingDto) {
    return this.bookingService.createBooking(req.user.id, dto);
  }

  @Delete(':id')
  @Roles(Role.STUDENT, Role.ADMIN, Role.SUPER_ADMIN)
  async cancelBooking(@Req() req: any, @Param('id') id: string) {
    return this.bookingService.cancelBooking(req.user, id);
  }

  @Post(':id/reschedule')
  @Roles(Role.STUDENT, Role.ADMIN, Role.SUPER_ADMIN)
  async rescheduleBooking(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { startsAt: string }
  ) {
    return this.bookingService.rescheduleBooking(req.user, id, body.startsAt);
  }

  @Get('student')
  @Roles(Role.STUDENT)
  async getStudentBookings(@Req() req: any) {
    return this.bookingService.getStudentBookings(req.user.id);
  }

  @Get('lecturer')
  @Roles(Role.LECTURER)
  async getLecturerBookings(@Req() req: any) {
    return this.bookingService.getLecturerBookings(req.user.id);
  }

  @Patch(':id')
  @Roles(Role.LECTURER, Role.ADMIN, Role.SUPER_ADMIN)
  async updateBooking(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { notes?: string; status?: string }
  ) {
    return this.bookingService.updateBooking(id, body);
  }
}
