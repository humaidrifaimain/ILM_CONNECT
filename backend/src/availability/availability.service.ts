import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSlotDto } from './dto/availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getLecturerSlots(lecturerId: string) {
    // If lecturerId does not have a lecturer profile (e.g. Admin inspecting slots)
    const profile = await this.prisma.lecturerProfile.findUnique({
      where: { userId: lecturerId },
    });

    let targetId = lecturerId;
    if (!profile) {
      const firstLecturer = await this.prisma.lecturerProfile.findFirst();
      if (firstLecturer) {
        targetId = firstLecturer.userId;
      }
    }

    return this.prisma.availabilitySlot.findMany({
      where: { lecturerId: targetId },
      orderBy: { startsAt: 'asc' },
    });
  }

  async createSlot(lecturerId: string, dto: CreateSlotDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    if (startsAt >= endsAt) {
      throw new BadRequestException('Slot start time must be before end time');
    }

    // Ensure target lecturer has a valid profile
    let targetId = lecturerId;
    const profile = await this.prisma.lecturerProfile.findUnique({
      where: { userId: lecturerId },
    });

    if (!profile) {
      const firstLecturer = await this.prisma.lecturerProfile.findFirst();
      if (firstLecturer) {
        targetId = firstLecturer.userId;
      } else {
        throw new BadRequestException('No active lecturer profile found to assign availability slot');
      }
    }

    // If identical slot already exists for this lecturer, return it (idempotent)
    const existingSame = await this.prisma.availabilitySlot.findFirst({
      where: {
        lecturerId: targetId,
        startsAt,
        endsAt,
      },
    });

    if (existingSame) {
      return existingSame;
    }

    // Check for overlap: existing starts before new ends AND existing ends after new starts
    const overlap = await this.prisma.availabilitySlot.findFirst({
      where: {
        lecturerId: targetId,
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });

    if (overlap) {
      if (overlap.status === 'BOOKED') {
        throw new BadRequestException('Slot overlaps with an already booked student session');
      }
      // If existing slot is OPEN, update its timing smoothly rather than rejecting
      return this.prisma.availabilitySlot.update({
        where: { id: overlap.id },
        data: {
          startsAt,
          endsAt,
          recurringRule: dto.recurringRule || overlap.recurringRule,
        },
      });
    }

    return this.prisma.availabilitySlot.create({
      data: {
        lecturerId: targetId,
        startsAt,
        endsAt,
        status: 'OPEN',
        recurringRule: dto.recurringRule || null,
      },
    });
  }

  async deleteSlot(lecturerId: string, slotId: string, isAdmin = false) {
    const slot = await this.prisma.availabilitySlot.findFirst({
      where: isAdmin ? { id: slotId } : { id: slotId, lecturerId },
    });

    if (!slot) {
      return { success: true, message: 'Slot already deleted' };
    }

    if (slot.status === 'BOOKED') {
      throw new BadRequestException('Cannot delete an already booked session slot');
    }

    return this.prisma.availabilitySlot.delete({
      where: { id: slotId },
    });
  }
}

