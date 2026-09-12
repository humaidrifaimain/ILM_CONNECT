import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  async submitFeedback(studentId: string, sessionId: string, score: number, comment = '') {
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      throw new BadRequestException('Rating must be a whole number between 1 and 5');
    }

    const cleanComment = comment.trim();
    if (cleanComment.length > 2000) {
      throw new BadRequestException('Feedback must be 2000 characters or fewer');
    }

    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, studentId },
      select: { id: true, lecturerId: true },
    });
    if (!session) throw new NotFoundException('Session not found for this student');

    const rating = await this.prisma.rating.upsert({
      where: { sessionId },
      create: {
        studentId,
        sessionId,
        lecturerId: session.lecturerId,
        score,
        comment: cleanComment,
      },
      update: {
        score,
        comment: cleanComment,
      },
    });

    // Optionally update lecturer's aggregate rating here
    const allRatings = await this.prisma.rating.aggregate({
      where: { lecturerId: session.lecturerId },
      _avg: { score: true },
      _count: { score: true },
    });

    await this.prisma.lecturerProfile.update({
      where: { userId: session.lecturerId },
      data: {
        ratingAvg: allRatings._avg.score || 0,
        ratingCount: allRatings._count.score || 0,
      },
    });

    return rating;
  }

  async getAllFeedbacks() {
    return this.prisma.rating.findMany({
      include: {
        student: { select: { userId: true, fullName: true } },
        lecturer: { select: { userId: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLecturerFeedbacks(lecturerId: string) {
    return this.prisma.rating.findMany({
      where: { lecturerId },
      select: {
        id: true,
        score: true,
        comment: true,
        createdAt: true,
        // Anonymized: NOT returning student details here
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
