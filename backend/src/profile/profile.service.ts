import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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
    const completedSessions = sessions.filter(
      s => s.status === 'COMPLETED' || s.status === 'NO_SHOW_STUDENT',
    );
    const canceledSessions = sessions.filter(s => s.status === 'CANCELED');

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

  /**
   * Fetch all assigned students with their current StudentProgress
   * Used by the lecturer courses section to see access levels per student.
   */
  async getStudentsProgress(lecturerUserId: string) {
    const students = await this.prisma.studentProfile.findMany({
      where: { assignedLecturerId: lecturerUserId },
      include: {
        user: { select: { id: true, email: true } },
        progress: {
          include: {
            currentLearningPath: true,
            currentModule: true,
            currentLesson: true,
          },
        },
      },
    });
    return students;
  }

  /**
   * Set a student's lesson access cursor (currentLessonId + currentModuleId).
   * Only the assigned lecturer may call this.
   */
  async updateStudentLessonAccess(
    lecturerUserId: string,
    studentId: string,
    lessonId: string,
  ) {
    // Verify this student is assigned to the lecturer
    const student = await this.prisma.studentProfile.findFirst({
      where: { userId: studentId, assignedLecturerId: lecturerUserId },
    });
    if (!student) {
      throw new ForbiddenException('Student is not assigned to you');
    }

    // Resolve the lesson and its module
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { include: { learningPath: true } } },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    const learningPathId = lesson.module.learningPathId;
    const moduleId = lesson.moduleId;

    // Calculate progress percentage
    const allModules = await this.prisma.module.findMany({
      where: { learningPathId },
      orderBy: { orderIndex: 'asc' },
      include: {
        lessons: { orderBy: { orderIndex: 'asc' } },
      },
    });
    const orderedLessons = allModules.flatMap(m => m.lessons);
    const lessonIdx = orderedLessons.findIndex(l => l.id === lessonId);
    const progressPercentage = orderedLessons.length > 0 && lessonIdx >= 0
      ? Math.round(((lessonIdx + 1) / orderedLessons.length) * 100)
      : 0;

    // Upsert StudentProgress
    await this.prisma.studentProgress.upsert({
      where: { studentId },
      create: {
        studentId,
        currentLearningPathId: learningPathId,
        currentModuleId: moduleId,
        currentLessonId: lessonId,
        progressPercentage,
      },
      update: {
        currentLearningPathId: learningPathId,
        currentModuleId: moduleId,
        currentLessonId: lessonId,
        progressPercentage,
      },
    });

    return { success: true, studentId, lessonId, moduleId, learningPathId, progressPercentage };
  }

  /**
   * Grant full access to all lessons in a course for a student.
   */
  async grantFullCourseAccess(
    lecturerUserId: string,
    studentId: string,
    learningPathId: string,
  ) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { userId: studentId, assignedLecturerId: lecturerUserId },
    });
    if (!student) {
      throw new ForbiddenException('Student is not assigned to you');
    }

    const modules = await this.prisma.module.findMany({
      where: { learningPathId },
      orderBy: { orderIndex: 'desc' },
      include: {
        lessons: { orderBy: { orderIndex: 'desc' } },
      },
    });

    const lastModule = modules.find(m => m.lessons.length > 0);
    const lastLesson = lastModule?.lessons[0];
    if (!lastLesson) throw new NotFoundException('No lessons found in this course');

    await this.prisma.studentProgress.upsert({
      where: { studentId },
      create: {
        studentId,
        currentLearningPathId: learningPathId,
        currentModuleId: lastLesson.moduleId,
        currentLessonId: lastLesson.id,
        progressPercentage: 100,
      },
      update: {
        currentLearningPathId: learningPathId,
        currentModuleId: lastLesson.moduleId,
        currentLessonId: lastLesson.id,
        progressPercentage: 100,
      },
    });

    return { success: true, studentId, lessonId: lastLesson.id, progressPercentage: 100 };
  }

  /**
   * Revoke all lesson access for a student (reset progress cursor to null).
   * Only the assigned lecturer may call this.
   */
  async revokeStudentAccess(lecturerUserId: string, studentId: string) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { userId: studentId, assignedLecturerId: lecturerUserId },
    });
    if (!student) {
      throw new ForbiddenException('Student is not assigned to you');
    }

    await this.prisma.studentProgress.updateMany({
      where: { studentId },
      data: {
        currentLessonId: null,
        currentModuleId: null,
        progressPercentage: 0,
      },
    });
    return { success: true, studentId };
  }
}
