import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';
import { CreateCourseAssessmentDto } from './course-assessment.dto';

@Injectable()
export class CurriculumService {
  constructor(private readonly prisma: PrismaService) {}

  async getAssessments(lecturerId: string, learningPathId: string) {
    await this.getPath(learningPathId);
    return this.prisma.courseAssessment.findMany({
      where: { lecturerId, learningPathId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAssessment(lecturerId: string, learningPathId: string, body: CreateCourseAssessmentDto) {
    await this.getPath(learningPathId);
    return this.prisma.courseAssessment.create({ data: {
      lecturerId, learningPathId, title: body.title.trim(),
      questions: body.questions.map(question => ({
        prompt: question.prompt.trim(),
        options: question.options.map(option => option.trim()),
        correctOption: question.correctOption,
      })),
    } });
  }

  async getRequests(userId: string, role: Role) {
    return this.prisma.courseRequest.findMany({
      where:
        role === Role.STUDENT
          ? { studentId: userId }
          : {
              lecturerId: userId,
              student: { assignedLecturerId: userId },
            },
      include: { learningPath: true, student: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async transact<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2002', 'P2034'].includes(error.code)
      ) {
        throw new ConflictException(
          'This request changed while you were reviewing it. Refresh and try again.',
        );
      }
      throw error;
    }
  }

  async requestCourse(studentId: string, learningPathId: string) {
    return this.transact(async (tx) => {
      const student = await tx.studentProfile.findUnique({
        where: { userId: studentId },
        include: { progress: true },
      });
      if (!student?.assignedLecturerId)
        throw new ConflictException(
          'A lecturer must be assigned before you can request a course. Contact support to arrange a match.',
        );
      const lecturer = await tx.user.findUnique({
        where: { id: student.assignedLecturerId },
      });
      if (
        !lecturer ||
        lecturer.role !== Role.LECTURER ||
        lecturer.status !== 'ACTIVE' ||
        lecturer.deletedAt
      ) {
        throw new ConflictException(
          'Your lecturer is unavailable. Contact support to arrange a match.',
        );
      }
      if (student.progress)
        throw new ConflictException(
          'You already have an assigned course. Ask your lecturer before changing it.',
        );
      const path = await tx.learningPath.findUnique({
        where: { id: learningPathId },
      });
      if (!path) throw new NotFoundException('Course not found');
      const existing = await tx.courseRequest.findUnique({
        where: { studentId_learningPathId: { studentId, learningPathId } },
      });
      if (
        existing?.status === 'PENDING' &&
        existing.lecturerId === student.assignedLecturerId
      )
        return existing;
      const request = await tx.courseRequest.upsert({
        where: { studentId_learningPathId: { studentId, learningPathId } },
        create: {
          studentId,
          learningPathId,
          lecturerId: student.assignedLecturerId,
        },
        update: {
          status: 'PENDING',
          reviewedAt: null,
          lecturerId: student.assignedLecturerId,
          createdAt: new Date(),
        },
      });
      await tx.notification.create({
        data: {
          userId: student.assignedLecturerId,
          type: 'COURSE_REQUESTED',
          channel: 'IN_APP',
          payloadJson: {
            requestId: request.id,
            title: 'Course request',
            message: `${student.fullName} requested ${path.title}.`,
            actionUrl: '/lecturer/courses',
          },
        },
      });
      return request;
    });
  }

  async reviewRequest(
    lecturerId: string,
    id: string,
    status: 'ACCEPTED' | 'DECLINED',
  ) {
    return this.transact(async (tx) => {
      const request = await tx.courseRequest.findUnique({
        where: { id },
        include: { student: true, learningPath: true },
      });
      if (!request) throw new NotFoundException('Course request not found');
      if (
        request.lecturerId !== lecturerId ||
        request.student.assignedLecturerId !== lecturerId
      ) {
        throw new ForbiddenException('This student is not assigned to you');
      }
      if (request.status !== 'PENDING')
        throw new ConflictException('This request has already been reviewed');
      if (status === 'ACCEPTED') {
        const progress = await tx.studentProgress.findUnique({
          where: { studentId: request.studentId },
        });
        if (
          progress &&
          progress.currentLearningPathId !== request.learningPathId
        ) {
          throw new ConflictException(
            'This student already has another course assigned. Review their current course first.',
          );
        }
        if (!progress)
          await tx.studentProgress.create({
            data: {
              studentId: request.studentId,
              currentLearningPathId: request.learningPathId,
              progressPercentage: 0,
            },
          });
      }
      const updated = await tx.courseRequest.update({
        where: { id },
        data: { status, reviewedAt: new Date() },
      });
      await tx.notification.create({
        data: {
          userId: request.studentId,
          type: `COURSE_REQUEST_${status}`,
          channel: 'IN_APP',
          payloadJson: {
            requestId: id,
            title:
              status === 'ACCEPTED'
                ? 'Course request accepted'
                : 'Course request declined',
            message: `${request.learningPath.title}: your lecturer ${status === 'ACCEPTED' ? 'accepted' : 'declined'} your request.`,
            actionUrl: '/student/courses',
          },
        },
      });
      return updated;
    });
  }

  async getAllPaths() {
    return this.prisma.learningPath.findMany({
      include: {
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });
  }

  async getPath(id: string) {
    const path = await this.prisma.learningPath.findUnique({
      where: { id },
      include: {
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });
    if (!path) throw new NotFoundException('Learning Path not found');
    return path;
  }
}
