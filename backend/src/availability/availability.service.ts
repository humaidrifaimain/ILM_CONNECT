import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSlotDto } from './dto/availability.dto';
import { lecturerConflictWindow } from './session-timing';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getLecturerSlots(lecturerId: string) {
    // If lecturerId does not have a lecturer profile (e.g. Admin inspecting slots)
    const profile = await this.prisma.lecturerProfile.findUnique({
      where: { userId: lecturerId },
    });

    if (!profile) throw new NotFoundException('Lecturer profile not found');
    const targetId = lecturerId;

    return this.prisma.availabilitySlot.findMany({
      where: { lecturerId: targetId },
      orderBy: { startsAt: 'asc' },
    });
  }

  async createSlot(lecturerId: string, dto: CreateSlotDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    if (
      !Number.isFinite(startsAt.getTime()) ||
      !Number.isFinite(endsAt.getTime()) ||
      startsAt >= endsAt
    ) {
      throw new BadRequestException('Slot start time must be before end time');
    }
    if (startsAt <= new Date())
      throw new BadRequestException('Availability must start in the future');

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${'lecturer:' + lecturerId}))`;
      const targetId = lecturerId;
      const profile = await tx.lecturerProfile.findUnique({
        where: { userId: lecturerId },
      });
      if (!profile) throw new NotFoundException('Lecturer profile not found');
      const shift = Array.isArray(profile.hourlyAvailabilityJson)
        ? profile.hourlyAvailabilityJson.map(Number)
        : [];
      const workingHour = (time: Date) =>
        Number(
          new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Colombo',
            hour: 'numeric',
            hourCycle: 'h23',
          }).format(time),
        );
      for (
        let time = +startsAt;
        time < +endsAt;
        time = Math.min(+endsAt, time + 60000)
      ) {
        if (!shift.includes(workingHour(new Date(time))))
          throw new BadRequestException(
            'Availability must stay within your assigned shift (Asia/Colombo)',
          );
      }
      if (!shift.includes(workingHour(new Date(+endsAt - 1))))
        throw new BadRequestException(
          'Availability must stay within your assigned shift (Asia/Colombo)',
        );

      // If identical slot already exists for this lecturer, return it (idempotent)
      const existingSame = await tx.availabilitySlot.findFirst({
        where: {
          lecturerId: targetId,
          startsAt,
          endsAt,
        },
      });

      if (existingSame) {
        return existingSame;
      }

      const overlap = await tx.availabilitySlot.findFirst({
        where: {
          lecturerId: targetId,
          ...lecturerConflictWindow(startsAt, endsAt),
        },
      });

      if (overlap) {
        if (overlap.status === 'BOOKED') {
          throw new BadRequestException(
            'Leave at least 10 minutes before and after a booked session',
          );
        }
        throw new BadRequestException(
          'Leave at least 10 minutes between availability sessions',
        );
      }

      return tx.availabilitySlot.create({
        data: {
          lecturerId: targetId,
          startsAt,
          endsAt,
          status: 'OPEN',
          recurringRule: dto.recurringRule || null,
        },
      });
    });
  }

  async deleteSlot(lecturerId: string, slotId: string, isAdmin = false) {
    return this.prisma.$transaction(async (tx) => {
      const target = isAdmin
        ? await tx.availabilitySlot.findUnique({ where: { id: slotId } })
        : null;
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${'lecturer:' + (target?.lecturerId || lecturerId)}))`;
      const slot = await tx.availabilitySlot.findFirst({
        where: isAdmin ? { id: slotId } : { id: slotId, lecturerId },
      });

      if (!slot) {
        return { success: true, message: 'Slot already deleted' };
      }

      if (slot.status === 'BOOKED') {
        throw new BadRequestException(
          'Cannot delete an already booked session slot',
        );
      }

      return tx.availabilitySlot.delete({
        where: { id: slotId },
      });
    });
  }
}
