import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  private validateStatus(status: unknown): asserts status is string {
    if (typeof status !== 'string' || !['PENDING', 'IN_REVIEW', 'RESOLVED'].includes(status)) throw new BadRequestException('Choose PENDING, IN_REVIEW or RESOLVED');
  }

  async createSupportTicket(userId: string, type: string, reason?: string) {
    const categories = ['LECTURER_CHANGE', 'TECHNICAL_ISSUE', 'BOOKING_SESSION', 'BILLING_PAYMENT', 'COURSE_MATERIALS', 'FEEDBACK_SUGGESTION', 'GENERAL_SUPPORT', 'TECHNICAL_LIVEKIT', 'STUDENT_REASSIGNMENT', 'PAYOUT_EARNINGS', 'AVAILABILITY_SCHEDULE', 'CURRICULUM_MATERIALS', 'GENERAL_LECTURER_SUPPORT'];
    if (typeof type !== 'string' || !categories.includes(type)) throw new BadRequestException('Choose a support category');
    if (typeof reason !== 'string' || !reason.trim() || reason.length > 10000) throw new BadRequestException('Describe your inquiry in 1 to 10,000 characters');
    return this.prisma.supportTicket.create({
      data: {
        userId,
        type,
        reason: reason.trim(),
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            studentProfile: { select: { fullName: true } },
            lecturerProfile: { select: { fullName: true } },
          },
        },
        messages: true,
      },
    });
  }

  async getMyTickets(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            studentProfile: { select: { fullName: true } },
            lecturerProfile: { select: { fullName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllTickets(status?: string, role?: string) {
    const where: any = {};
    if (status && status !== 'ALL') {
      this.validateStatus(status);
      where.status = status;
    }
    if (role && role !== 'ALL') {
      if (!Object.values(Role).includes(role as Role)) throw new BadRequestException('Invalid requester role');
      where.user = { role: role as Role };
    }

    return this.prisma.supportTicket.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            studentProfile: {
              select: {
                fullName: true,
                country: true,
                phone: true,
                currentTier: true,
              },
            },
            lecturerProfile: {
              select: {
                fullName: true,
                qualifications: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTicketById(id: string, user: any) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            studentProfile: {
              select: {
                fullName: true,
                country: true,
                phone: true,
                currentTier: true,
              },
            },
            lecturerProfile: {
              select: {
                fullName: true,
                qualifications: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) throw new NotFoundException('Support ticket not found');

    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
    if (!isAdmin && ticket.userId !== user.id) {
      throw new ForbiddenException('You do not have access to view this ticket');
    }

    return ticket;
  }

  async addTicketMessage(id: string, user: any, messageText: string, newStatus?: string) {
    if (typeof messageText !== 'string' || !messageText.trim() || messageText.length > 10000) throw new BadRequestException('Write a reply between 1 and 10,000 characters');
    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
    if (newStatus !== undefined) {
      this.validateStatus(newStatus);
      if (!isAdmin) throw new ForbiddenException('Only administrators can choose a ticket status');
    }
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
    });

    if (!ticket) throw new NotFoundException('Support ticket not found');

    if (!isAdmin && ticket.userId !== user.id) {
      throw new ForbiddenException('You cannot reply to this ticket');
    }

    let senderName = 'Support Desk';
    if (isAdmin) {
      senderName = user.studentProfile?.fullName || user.lecturerProfile?.fullName || 'Academic Support Desk';
    } else if (user.role === Role.LECTURER) {
      senderName = user.lecturerProfile?.fullName || user.email?.split('@')[0] || 'Scholar Lecturer';
    } else {
      senderName = user.studentProfile?.fullName || user.email?.split('@')[0] || 'Student';
    }

    await this.prisma.supportTicketMessage.create({
      data: {
        ticketId: id,
        senderId: user.id,
        senderRole: user.role,
        senderName,
        message: messageText.trim(),
      },
    });

    // Automatically advance status or apply requested status
    let targetStatus = newStatus;
    if (!targetStatus) {
      if (isAdmin && ticket.status === 'PENDING') {
        targetStatus = 'IN_REVIEW';
      } else if (!isAdmin && ticket.status === 'RESOLVED') {
        targetStatus = 'IN_REVIEW'; // reopening ticket
      }
    }

    if (targetStatus && targetStatus !== ticket.status) {
      await this.prisma.supportTicket.update({
        where: { id },
        data: {
          status: targetStatus,
          resolvedAt: targetStatus === 'RESOLVED' ? new Date() : (targetStatus === 'PENDING' || targetStatus === 'IN_REVIEW' ? null : undefined),
        },
      });
    }

    return this.getTicketById(id, user);
  }

  async updateTicketStatus(id: string, status: string) {
    this.validateStatus(status);
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    return this.prisma.supportTicket.update({
      where: { id },
      data: {
        status,
        resolvedAt: status === 'RESOLVED' ? new Date() : null,
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            studentProfile: { select: { fullName: true } },
            lecturerProfile: { select: { fullName: true } },
          },
        },
      },
    });
  }
}
