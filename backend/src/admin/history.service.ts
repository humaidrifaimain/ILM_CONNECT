import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const person = { userId: true, fullName: true } as const;
const sessionInclude = {
  student: { select: person },
  lecturer: { select: person },
  lesson: { include: { module: { include: { learningPath: true } } } },
  notes: true,
  rating: true,
  materials: true,
} satisfies Prisma.SessionInclude;

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getHistory(id: string) {
    return this.prisma.$transaction((tx) => this.readHistory(tx, id), {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      maxWait: 10_000,
      timeout: 15_000,
    });
  }

  private async readHistory(prisma: Prisma.TransactionClient, id: string) {
    const account = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        deletedAt: true,
        gender: true,
        dateOfBirth: true,
      },
    });
    if (!account || !['STUDENT', 'LECTURER'].includes(account.role))
      throw new NotFoundException('Student or lecturer not found');
    const isStudent = account.role === 'STUDENT';
    const scope = isStudent ? { studentId: id } : { lecturerId: id };
    const sessions = await prisma.session.findMany({
      where: scope,
      include: sessionInclude,
      orderBy: { startsAt: 'desc' },
    });
    const reports = await prisma.progressReport.findMany({
      where: scope,
      include: { student: { select: person }, lecturer: { select: person } },
      orderBy: { generatedAt: 'desc' },
    });
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    const assessments = reports.flatMap((report) => {
      const content = report.contentJson;
      if (
        !content ||
        typeof content !== 'object' ||
        Array.isArray(content) ||
        !Array.isArray(content.assessments)
      )
        return [];
      return content.assessments
        .filter(
          (item): item is Prisma.JsonObject =>
            !!item && typeof item === 'object' && !Array.isArray(item),
        )
        .map((item) => ({
          id: typeof item.id === 'string' ? item.id : undefined,
          title: typeof item.title === 'string' ? item.title : undefined,
          score: typeof item.score === 'number' ? item.score : undefined,
          maxScore:
            typeof item.maxScore === 'number' ? item.maxScore : undefined,
          feedback:
            typeof item.feedback === 'string' ? item.feedback : undefined,
          date:
            typeof item.date === 'string' &&
            Number.isFinite(Date.parse(item.date))
              ? item.date
              : undefined,
          reportId: report.id,
          reportMonth: report.periodMonth,
          student: report.student,
          lecturer: report.lecturer,
        }));
    });
    const completed = sessions.filter(
      (session) => session.status === 'COMPLETED',
    );
    const sessionSummary = {
      totalSessions: sessions.length,
      completedSessions: completed.length,
      scheduledSessions: sessions.filter(
        (session) => session.status === 'SCHEDULED',
      ).length,
      inProgressSessions: sessions.filter(
        (session) => session.status === 'IN_PROGRESS',
      ).length,
      canceledSessions: sessions.filter(
        (session) => session.status === 'CANCELED',
      ).length,
      studentNoShows: sessions.filter(
        (session) => session.status === 'NO_SHOW_STUDENT',
      ).length,
      lecturerNoShows: sessions.filter(
        (session) => session.status === 'NO_SHOW_LECTURER',
      ).length,
      assessmentCount: assessments.length,
    };
    if (isStudent) {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId: id },
        include: {
          assignedLecturer: { select: person },
          subscriptions: {
            include: { payments: { orderBy: { processedAt: 'desc' } } },
            orderBy: { currentPeriodStart: 'desc' },
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
          courseRequests: {
            include: {
              learningPath: true,
              lecturer: {
                select: { id: true, lecturerProfile: { select: person } },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      if (!profile) throw new NotFoundException('Student profile not found');
      const payments = profile.subscriptions
        .flatMap((subscription) =>
          subscription.payments.map((payment) => ({
            ...payment,
            tier: subscription.tier,
          })),
        )
        .sort((a, b) => b.processedAt.getTime() - a.processedAt.getTime());
      const successful = payments.filter(
        (payment) => payment.status === 'SUCCESSFUL',
      );
      const paymentMonths = [
        ...new Set(
          successful.map((payment) =>
            new Intl.DateTimeFormat('en-CA', {
              timeZone: 'Asia/Colombo',
              year: 'numeric',
              month: '2-digit',
            }).format(payment.processedAt),
          ),
        ),
      ];
      const auditLogs = await this.getAuditLogs(
        prisma,
        id,
        [
          ...sessions,
          ...reports,
          ...tickets,
          ...payments,
          ...profile.subscriptions,
          ...profile.courseRequests,
        ].map((row) => row.id),
      );
      return {
        account,
        profile,
        sessions,
        reports,
        assessments,
        tickets,
        payments,
        auditLogs,
        summary: {
          ...sessionSummary,
          attendedSessions: completed.length,
          successfulPayments: successful.length,
          paidMonths: paymentMonths.length,
          paymentMonths,
          totalPaidLkr: successful.reduce(
            (sum, payment) => sum + payment.amountLkr,
            0,
          ),
          refundedLkr: payments
            .filter((payment) => payment.status === 'REFUNDED')
            .reduce((sum, payment) => sum + payment.amountLkr, 0),
        },
      };
    }
    const profile = await prisma.lecturerProfile.findUnique({
      where: { userId: id },
      include: {
        assignedStudents: {
          select: {
            ...person,
            currentTier: true,
            country: true,
            user: { select: { email: true, status: true } },
          },
        },
        payouts: { orderBy: { initiatedAt: 'desc' } },
        sessionBlocks: {
          include: { student: { select: person } },
          orderBy: { completedAt: 'desc' },
        },
        ratingsReceived: {
          include: { student: { select: person } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!profile) throw new NotFoundException('Lecturer profile not found');
    const authoredAssessments = await prisma.courseAssessment.findMany({
      where: { lecturerId: id },
      select: {
        id: true,
        title: true,
        createdAt: true,
        learningPath: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const availableLkr = profile.sessionBlocks
      .filter((block) => block.status === 'COMPLETED')
      .reduce((sum, block) => sum + block.payoutAmountLkr, 0);
    const pendingPayoutLkr = profile.payouts
      .filter((payout) => payout.status === 'PENDING')
      .reduce((sum, payout) => sum + payout.amountLkr, 0);
    const paidOutLkr = profile.payouts
      .filter((payout) => payout.status === 'SUCCESSFUL')
      .reduce((sum, payout) => sum + payout.amountLkr, 0);
    const auditLogs = await this.getAuditLogs(
      prisma,
      id,
      [
        ...sessions,
        ...reports,
        ...tickets,
        ...profile.payouts,
        ...profile.sessionBlocks,
        ...authoredAssessments,
      ].map((row) => row.id),
    );
    return {
      account,
      profile,
      sessions,
      reports,
      assessments,
      authoredAssessments,
      tickets,
      auditLogs,
      summary: {
        ...sessionSummary,
        assignedStudents: profile.assignedStudents.length,
        studentsTaught: new Set(sessions.map((session) => session.studentId))
          .size,
        availableLkr,
        pendingPayoutLkr,
        owedLkr: availableLkr + pendingPayoutLkr,
        paidOutLkr,
      },
    };
  }

  private getAuditLogs(
    prisma: Prisma.TransactionClient,
    id: string,
    relatedIds: string[],
  ) {
    return prisma.auditLog.findMany({
      where: {
        OR: [
          { actorId: id },
          { entityId: { in: [id, ...relatedIds] } },
          { details: { path: ['lecturerUserId'], equals: id } },
          { details: { path: ['studentUserId'], equals: id } },
          { details: { path: ['lecturerId'], equals: id } },
        ],
      },
      include: { actor: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
