import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessageService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all conversation threads for a user, enriched with:
   * - the other participant's profile (name, initials)
   * - the latest message in each thread
   * - unread count for the current user
   */
  async getThreads(userId: string) {
    const messages = await this.prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { recipientId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['threadId'],
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            role: true,
            studentProfile: { select: { fullName: true } },
            lecturerProfile: { select: { fullName: true } },
          },
        },
        recipient: {
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

    const threadsWithMeta = await Promise.all(
      messages.map(async (msg) => {
        const unreadCount = await this.prisma.message.count({
          where: {
            threadId: msg.threadId,
            recipientId: userId,
            readAt: null,
          },
        });

        const otherUser = msg.senderId === userId ? msg.recipient : msg.sender;
        const otherName =
          (otherUser as any).lecturerProfile?.fullName ||
          (otherUser as any).studentProfile?.fullName ||
          (otherUser as any).email;

        return {
          threadId: msg.threadId,
          lastMessage: {
            id: msg.id,
            content: msg.content,
            senderId: msg.senderId,
            createdAt: msg.createdAt,
          },
          otherUser: {
            id: (otherUser as any).id,
            name: otherName,
            role: (otherUser as any).role,
            initials: otherName
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase(),
          },
          unreadCount,
        };
      }),
    );

    return threadsWithMeta;
  }

  /**
   * Get all messages in a thread. Security: caller must be a participant.
   */
  async getMessagesInThread(userId: string, threadId: string) {
    const messages = await this.prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            role: true,
            studentProfile: { select: { fullName: true } },
            lecturerProfile: { select: { fullName: true } },
          },
        },
      },
    });

    if (messages.length > 0) {
      const isParticipant = messages.some(
        (m) => m.senderId === userId || m.recipientId === userId,
      );
      if (!isParticipant) {
        throw new ForbiddenException('You are not a participant in this thread');
      }
    }

    return messages;
  }

  /**
   * Send a message and auto-create an IN_APP notification for the recipient.
   */
  async sendMessage(
    senderId: string,
    recipientId: string,
    content: string,
    threadId?: string,
  ) {
    const computedThreadId =
      threadId || [senderId, recipientId].sort().join('_');

    const message = await this.prisma.message.create({
      data: {
        senderId,
        recipientId,
        content,
        threadId: computedThreadId,
      },
      include: {
        sender: {
          select: {
            studentProfile: { select: { fullName: true } },
            lecturerProfile: { select: { fullName: true } },
          },
        },
      },
    });

    const senderName =
      (message.sender as any).lecturerProfile?.fullName ||
      (message.sender as any).studentProfile?.fullName ||
      'Someone';

    const preview =
      content.length > 60 ? content.slice(0, 57) + '...' : content;

    await this.prisma.notification.create({
      data: {
        userId: recipientId,
        type: 'NEW_MESSAGE',
        channel: 'IN_APP',
        payloadJson: {
          threadId: computedThreadId,
          senderName,
          preview,
          messageId: message.id,
        },
      },
    });

    return message;
  }

  /**
   * Count total unread messages for a user across all threads.
   */
  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.message.count({
      where: {
        recipientId: userId,
        readAt: null,
      },
    });
    return { count };
  }

  /**
   * Mark all messages in a specific thread as read for the requesting user.
   */
  async markThreadAsRead(userId: string, threadId: string): Promise<void> {
    await this.prisma.message.updateMany({
      where: {
        threadId,
        recipientId: userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    // Also mark matching NEW_MESSAGE notifications as read
    try {
      const unreadNotifs = await this.prisma.notification.findMany({
        where: {
          userId,
          type: 'NEW_MESSAGE',
          readAt: null,
        },
      });

      const matchingIds = unreadNotifs
        .filter((n) => (n.payloadJson as any)?.threadId === threadId)
        .map((n) => n.id);

      if (matchingIds.length > 0) {
        await this.prisma.notification.updateMany({
          where: { id: { in: matchingIds } },
          data: { readAt: new Date() },
        });
      }
    } catch {
      // Non-blocking notification sync
    }
  }
}

