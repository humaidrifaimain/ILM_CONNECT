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

  async getStudentDetailForLecturer(lecturerUserId: string, studentId: string) {
    // Fetch the student profile (only accessible if this lecturer is assigned)
    const profile = await this.prisma.studentProfile.findFirst({
      where: {
        userId: studentId,
        assignedLecturerId: lecturerUserId,
      },
      include: {
        user: { select: { id: true, email: true, createdAt: true } },
        subscriptions: {
          orderBy: { currentPeriodStart: 'desc' },
          take: 1,
        },
        progress: {
          include: {
            currentLearningPath: true,
            currentModule: true,
            currentLesson: true,
          },
        },
        certificates: {
          include: { learningPath: true },
          orderBy: { issuedAt: 'desc' },
        },
      },
    });

    if (!profile) throw new NotFoundException('Student not found or not assigned to this lecturer');

    // Fetch all sessions between this lecturer and student
    const sessions = await this.prisma.session.findMany({
      where: { studentId, lecturerId: lecturerUserId },
      include: {
        notes: true,
        rating: true,
        lesson: { include: { module: true } },
        materials: true,
      },
      orderBy: { startsAt: 'asc' },
    });

    // Fetch progress reports written by this lecturer for this student
    const progressReports = await this.prisma.progressReport.findMany({
      where: { studentId, lecturerId: lecturerUserId },
      orderBy: { generatedAt: 'desc' },
    });

    const now = new Date();
    const upcomingSessions = sessions.filter(
      s => s.status === 'SCHEDULED' && new Date(s.startsAt) > now,
    );
    const completedSessions = sessions.filter(s => s.status === 'COMPLETED');
    const canceledSessions = sessions.filter(
      s => s.status === 'CANCELED' || s.status === 'NO_SHOW_STUDENT',
    );

    const completedWithRating = sessions.filter(
      s => s.status === 'COMPLETED' && s.notes && s.notes.studentProgressRating > 0,
    );

    // Extract assessments from progress reports
    const assessments: any[] = [];
    progressReports.forEach((pr: any) => {
      const content = pr.contentJson;
      if (content && typeof content === 'object' && Array.isArray((content as any).assessments)) {
        (content as any).assessments.forEach((a: any) => {
          assessments.push({
            ...a,
            reportMonth: pr.periodMonth,
            reportId: pr.id,
          });
        });
      }
    });

    return {
      profile,
      stats: {
        totalSessions: sessions.length,
        upcomingCount: upcomingSessions.length,
        completedCount: completedSessions.length,
        canceledCount: canceledSessions.length,
        avgStudentRating:
          completedWithRating.length > 0
            ? (
                completedWithRating.reduce(
                  (sum, s) => sum + (s.notes?.studentProgressRating ?? 0),
                  0,
                ) / completedWithRating.length
              ).toFixed(1)
            : null,
        progressPercentage: profile.progress?.progressPercentage ?? 0,
        assessmentCount: assessments.length,
      },
      upcomingSessions,
      completedSessions,
      canceledSessions,
      progressReports,
      assessments,
    };
  }
}
