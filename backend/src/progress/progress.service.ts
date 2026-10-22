import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { randomUUID } from 'node:crypto';
@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}
  async getStudentProgress(studentId: string) {
    const progress = await this.prisma.studentProgress.findUnique({ where: { studentId }, include: { currentLearningPath: true, currentModule: true, currentLesson: true } });
    if (!progress) throw new NotFoundException('Student progress not found');
    return progress;
  }
  private async checkAssigned(studentId: string, user: { id: string; role: Role }) {
    if (typeof studentId !== 'string' || !studentId) throw new BadRequestException('Choose a student');
    const student = await this.prisma.studentProfile.findUnique({ where: { userId: studentId } });
    if (!student) throw new NotFoundException('Student not found');
    if (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN && student.assignedLecturerId !== user.id) throw new ForbiddenException('Student is not assigned to you');
  }
  async advanceProgress(studentId: string, user: { id: string; role: Role }) {
    await this.checkAssigned(studentId, user);
    const progress = await this.getStudentProgress(studentId);
    const modules = await this.prisma.module.findMany({ where: { learningPathId: progress.currentLearningPathId }, orderBy: { orderIndex: 'asc' }, include: { lessons: { orderBy: { orderIndex: 'asc' } } } });
    const lessons = modules.flatMap(module => module.lessons);
    const current = lessons.findIndex(lesson => lesson.id === progress.currentLessonId);
    const next = lessons[current + 1];
    if (!next) throw new BadRequestException('No next lesson is available');
    return this.prisma.studentProgress.update({ where: { studentId }, data: { currentLessonId: next.id, currentModuleId: next.moduleId, progressPercentage: Math.round((current + 2) / lessons.length * 100) } });
  }
  async getAssessments(studentId: string) {
    const reports = await this.prisma.progressReport.findMany({ where: { studentId }, orderBy: { generatedAt: 'desc' } });
    return reports.flatMap(report => {
      const content = report.contentJson as { assessments?: any[] } | null;
      return Array.isArray(content?.assessments) ? content.assessments.map(item => ({ ...item, reportMonth: report.periodMonth })) : [];
    });
  }
  async recordAssessment(user: { id: string; role: Role }, data: { studentId: string; title: string; score: number; feedback: string }) {
    await this.checkAssigned(data.studentId, user);
    if (typeof data.title !== 'string' || !data.title.trim() || data.title.length > 200 || typeof data.score !== 'number' || !Number.isFinite(data.score) || data.score < 0 || data.score > 100 || typeof data.feedback !== 'string' || data.feedback.length > 2000) throw new BadRequestException('Provide a title, score from 0–100, and feedback up to 2000 characters');
    const progress = await this.getStudentProgress(data.studentId);
    const assessment = { id: randomUUID(), title: data.title.trim(), score: data.score, maxScore: 100, feedback: data.feedback, courseId: progress.currentLearningPathId, date: new Date().toISOString(), type: 'Lecturer assessment', status: 'GRADED' };
    const student = await this.prisma.studentProfile.findUnique({ where: { userId: data.studentId } });
    if (!student?.assignedLecturerId) throw new BadRequestException('Assign a lecturer before recording an assessment');
    await this.prisma.progressReport.create({ data: { studentId: data.studentId, lecturerId: user.role === Role.LECTURER ? user.id : student.assignedLecturerId, periodMonth: assessment.date.slice(0, 7), contentJson: { assessments: [assessment] } } });
    return assessment;
  }
  async getCertificates(studentId: string) {
    return this.prisma.certificate.findMany({ where: { studentId }, include: { learningPath: true } });
  }
}
