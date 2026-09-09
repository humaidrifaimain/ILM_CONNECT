import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getStudentProfile(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: { 
        user: true,
        assignedLecturer: true,
      },
    });
    if (!profile) throw new NotFoundException('Student profile not found');
    return profile;
  }

  async updateStudentProfile(userId: string, data: any) {
    return this.prisma.studentProfile.update({
      where: { userId },
      data,
    });
  }

  async getLecturerProfile(userId: string) {
    const profile = await this.prisma.lecturerProfile.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!profile) throw new NotFoundException('Lecturer profile not found');
    return profile;
  }

  async updateLecturerProfile(userId: string, data: any) {
    return this.prisma.lecturerProfile.update({
      where: { userId },
      data,
    });
  }

  async getAllLecturers() {
    return this.prisma.lecturerProfile.findMany({
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });
  }

  async getMyStudents(lecturerUserId: string) {
    return this.prisma.studentProfile.findMany({
      where: { assignedLecturerId: lecturerUserId },
      include: {
        user: { select: { id: true, email: true } },
      },
    });
  }
}
