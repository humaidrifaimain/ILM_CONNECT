import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateLecturerDto } from './dto/create-lecturer.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getWaitlist() { return this.prisma.waitlistEntry.findMany({ orderBy: { createdAt: 'desc' } }); }

  async getStats() {
    const totalStudents = await this.prisma.user.count({ where: { role: 'STUDENT' } });
    const activeStudents = await this.prisma.user.count({ where: { role: 'STUDENT', status: 'ACTIVE' } });
    
    const activeLecturers = await this.prisma.user.count({ where: { role: 'LECTURER', status: 'ACTIVE' } });
    const pendingApplications = await this.prisma.user.count({ where: { role: 'LECTURER', status: 'PENDING' } });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setDate(today.getDate() + 1);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const sessionsToday = await this.prisma.session.count({
      where: { startsAt: { gte: today, lt: endOfToday } },
    });

    const sessionsThisWeek = await this.prisma.session.count({
      where: { startsAt: { gte: startOfWeek } },
    });

    const mrrRes = await this.prisma.subscription.aggregate({
      _sum: { lkrAmount: true },
      where: { status: 'ACTIVE', currentPeriodEnd: { gt: new Date() } },
    });
    const mrrLKR = mrrRes._sum.lkrAmount || 0;
    const mrrUSD = null; // No verified currency conversion is configured.

    const revenueRes = await this.prisma.payment.aggregate({
      _sum: { amountLkr: true },
      where: { status: 'SUCCESSFUL', processedAt: { gte: startOfMonth } },
    });
    const revenueThisMonth = revenueRes._sum.amountLkr || 0;

    const payoutsRes = await this.prisma.payout.aggregate({
      _sum: { amountLkr: true },
      where: { status: 'SUCCESSFUL', initiatedAt: { gte: startOfMonth } },
    });
    const payoutsThisMonth = payoutsRes._sum.amountLkr || 0;

    const ratingRes = await this.prisma.rating.aggregate({
      _avg: { score: true },
    });
    const avgRating = ratingRes._avg.score ? Number(ratingRes._avg.score.toFixed(1)) : 0;

    const paymentFailures = await this.prisma.payment.count({
      where: { status: 'FAILED', processedAt: { gte: startOfWeek } },
    });

    return {
      revenueThisMonth,
      mrrLKR,
      mrrUSD,
      activeStudents,
      totalStudents,
      activeLecturers,
      pendingApplications,
      sessionsToday,
      sessionsThisWeek,
      payoutsThisMonth,
      profitThisMonth: revenueThisMonth - payoutsThisMonth,
      unassignedStudents: await this.prisma.studentProfile.count({ where: { assignedLecturerId: null } }),
      lecturerChangeRequests: await this.prisma.supportTicket.count({ where: { type: 'LECTURER_CHANGE', status: 'PENDING' } }),
      paymentFailures,
      churnRate: null,
      avgRating,
    };
  }

  async getUsers(role?: string, status?: string) {
    return this.prisma.user.findMany({
      where: {
        ...(role && role !== 'all' && { role: role.toUpperCase() as any }),
        ...(status && status !== 'all' && { status: status.toUpperCase() as any }),
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        studentProfile: {
          select: {
            fullName: true,
            phone: true,
            country: true,
            currentTier: true,
            assignedLecturer: {
              select: {
                userId: true,
                fullName: true,
              },
            },
          },
        },
        lecturerProfile: {
          select: {
            fullName: true,
            specializations: true,
            ratingAvg: true,
            ratingCount: true,
            status: true,
            hourlyAvailabilityJson: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createLecturer(dto: import('./dto/create-lecturer.dto').CreateLecturerDto, adminUserId?: string) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException(`User with email ${email} already exists`);
    }

    const saltRounds = 10;
    const defaultPassword = dto.password;
    const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

    const specializations = Array.isArray(dto.specializations)
      ? dto.specializations
      : typeof dto.specializations === 'string'
      ? dto.specializations.split(',').map((s: string) => s.trim()).filter(Boolean)
      : ['Quran Recitation'];

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.LECTURER,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        lecturerProfile: {
          create: {
            fullName: dto.fullName.trim(),
            bio: dto.bio || `Islamic Scholar & Lecturer in ${specializations.join(', ')}`,
            qualifications: dto.qualifications || '',
            specializations,
            languages: dto.languages || ['English', 'Arabic'],
            hourlyAvailabilityJson: Array.isArray(dto.hourlyAvailabilityJson) && dto.hourlyAvailabilityJson.length >= 4
              ? dto.hourlyAvailabilityJson
              : [10, 11, 12, 13],
            payoutMethod: 'bank_transfer',
            payoutDetails: '',
            ratingAvg: 0,
            ratingCount: 0,
            status: UserStatus.ACTIVE,
          },
        },
      },
      include: {
        lecturerProfile: true,
      },
    });

    if (adminUserId) {
      await this.prisma.auditLog.create({
        data: {
          action: 'ADMIN_CREATED_LECTURER',
          actorId: adminUserId,
          entity: 'USER',
          entityId: user.id,
          details: { lecturerId: user.id, email: user.email, name: dto.fullName },
        },
      }).catch(() => null);
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      lecturerProfile: user.lecturerProfile,
    };
  }

  async assignLecturer(studentUserId: string, lecturerUserId: string, adminUserId?: string) {
    const studentUser = await this.prisma.user.findUnique({
      where: { id: studentUserId },
      include: { studentProfile: true },
    });
    if (!studentUser) {
      throw new NotFoundException('Student user not found');
    }

    const lecturerProfile = await this.prisma.lecturerProfile.findUnique({
      where: { userId: lecturerUserId },
    });
    if (!lecturerProfile) {
      throw new NotFoundException('Lecturer profile not found');
    }

    const updated = await this.prisma.studentProfile.upsert({
      where: { userId: studentUserId },
      update: { assignedLecturerId: lecturerUserId },
      create: {
        userId: studentUserId,
        fullName: studentUser.email.split('@')[0],
        phone: 'Not provided',
        country: 'Sri Lanka',
        timezone: 'Asia/Colombo',
        preferredLanguage: 'English',
        learningGoals: 'Quran Studies',
        currentTier: 'STANDARD',
        assignedLecturerId: lecturerUserId,
      },
      include: {
        assignedLecturer: {
          select: {
            userId: true,
            fullName: true,
          },
        },
      },
    });

    if (adminUserId) {
      await this.prisma.auditLog.create({
        data: {
          action: 'ADMIN_ASSIGNED_LECTURER',
          actorId: adminUserId,
          entity: 'STUDENT_PROFILE',
          entityId: studentUserId,
          details: { studentUserId, lecturerUserId },
        },
      }).catch(() => null);
    }

    return updated;
  }

  async updateLecturer(id: string, dto: any) {
    const lecturerProfile = await this.prisma.lecturerProfile.findUnique({
      where: { userId: id }
    });
    if (!lecturerProfile) {
      throw new NotFoundException('Lecturer profile not found');
    }
    
    const updateData: any = {};
    if (dto.hourlyAvailabilityJson !== undefined) {
      updateData.hourlyAvailabilityJson = dto.hourlyAvailabilityJson;
    }
    
    return this.prisma.lecturerProfile.update({
      where: { userId: id },
      data: updateData,
    });
  }

  async updateUserStatus(id: string, status: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async getSessions() {
    return this.prisma.session.findMany({
      include: {
        student: {
          include: {
            user: { select: { id: true, email: true } },
          },
        },
        lecturer: {
          include: {
            user: { select: { id: true, email: true } },
          },
        },
        lesson: {
          include: {
            module: {
              include: {
                learningPath: true,
              },
            },
          },
        },
        notes: true,
      },
      orderBy: { startsAt: 'desc' },
      take: 200,
    });
  }

  async getFinanceOverview() {
    const payments = await this.prisma.payment.findMany({
      where: { status: 'SUCCESSFUL' },
      orderBy: { processedAt: 'desc' },
      take: 50,
    });

    const payouts = await this.prisma.payout.findMany({
      orderBy: { initiatedAt: 'desc' },
      take: 50,
    });

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthlyPayments = await this.prisma.payment.findMany({
      where: { status: 'SUCCESSFUL', processedAt: { gte: monthStart } },
      select: { amountLkr: true, subscription: { select: { tier: true, studentId: true } } },
    });
    const grouped = new Map<string, { revenue: number; students: Set<string> }>();
    for (const payment of monthlyPayments) {
      const tier = payment.subscription.tier;
      const row = grouped.get(tier) || { revenue: 0, students: new Set<string>() };
      row.revenue += payment.amountLkr;
      row.students.add(payment.subscription.studentId);
      grouped.set(tier, row);
    }
    const revenueByPlan = Array.from(grouped, ([tier, row]) => ({ tier, revenue: row.revenue, students: row.students.size }));
    return { payments, payouts, revenueByPlan };
  }

  async getFeedback() {
    return this.prisma.rating.findMany({
      select: { id: true, score: true, comment: true, createdAt: true, student: { select: { fullName: true } }, lecturer: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' }, take: 200,
    });
  }

  async getAuditLogs() {
    return this.prisma.auditLog.findMany({
      include: { actor: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async updatePayoutStatus(id: string, status: string) {
    if (!['SUCCESSFUL', 'FAILED'].includes(status)) throw new BadRequestException('Choose SUCCESSFUL or FAILED');
    return this.prisma.$transaction(async tx => {
      const payout = await tx.payout.findUnique({ where: { id } });
      if (!payout) throw new NotFoundException('Payout not found');
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${payout.lecturerId}))`;
      const updated = await tx.payout.updateMany({ where: { id, status: 'PENDING' }, data: { status: status as any, completedAt: status === 'SUCCESSFUL' ? new Date() : null } });
      if (updated.count !== 1) throw new BadRequestException('Only pending payouts can be processed');
      const blockIds = Array.isArray(payout.sessionBlocksIncluded) ? payout.sessionBlocksIncluded.filter((value): value is string => typeof value === 'string') : [];
      await tx.sessionBlock.updateMany({ where: { id: { in: blockIds }, lecturerId: payout.lecturerId }, data: { status: status === 'SUCCESSFUL' ? 'PAID_OUT' : 'COMPLETED' } });
      return tx.payout.findUnique({ where: { id } });
    });
  }
}
