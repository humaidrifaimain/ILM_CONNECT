import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  async createSupportTicket(userId: string, type: string, reason?: string) {
    return this.prisma.supportTicket.create({
      data: {
        userId,
        type,
        reason,
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
      where.status = status;
    }
    if (role && role !== 'ALL') {
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
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
    });

    if (!ticket) throw new NotFoundException('Support ticket not found');

    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
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
