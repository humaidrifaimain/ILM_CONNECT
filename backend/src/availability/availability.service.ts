import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSlotDto } from './dto/availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getLecturerSlots(lecturerId: string) {
    return this.prisma.availabilitySlot.findMany({
      where: { lecturerId },
      orderBy: { startsAt: 'asc' },
    });
  }

  async createSlot(lecturerId: string, dto: CreateSlotDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    if (startsAt >= endsAt) {
      throw new BadRequestException('Slot start time must be before end time');
    }

    // If identical slot already exists for this lecturer, return it (idempotent)
    const existingSame = await this.prisma.availabilitySlot.findFirst({
      where: {
        lecturerId,
        startsAt,
        endsAt,
      },
    });

    if (existingSame) {
      return existingSame;
    }

    // Check for overlap
    const overlap = await this.prisma.availabilitySlot.findFirst({
      where: {
        lecturerId,
        OR: [
          {
            startsAt: { lte: startsAt },
            endsAt: { gt: startsAt },
          },
          {
            startsAt: { lt: endsAt },
            endsAt: { gte: endsAt },
          },
        ],
      },
    });

    if (overlap) {
      throw new BadRequestException('Slot overlaps with an existing slot');
    }

    return this.prisma.availabilitySlot.create({
      data: {
        lecturerId,
        startsAt,
        endsAt,
        status: 'OPEN',
        recurringRule: dto.recurringRule || null,
      },
    });
  }

  async deleteSlot(lecturerId: string, slotId: string) {
    const slot = await this.prisma.availabilitySlot.findFirst({
      where: { id: slotId, lecturerId },
    });

    if (!slot) {
      return { success: true, message: 'Slot already deleted' };
    }

    if (slot.status === 'BOOKED') {
      throw new BadRequestException('Cannot delete a booked slot');
    }

    return this.prisma.availabilitySlot.delete({
      where: { id: slotId },
    });
  }
}

