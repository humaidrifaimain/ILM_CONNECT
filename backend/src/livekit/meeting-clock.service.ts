import { BadRequestException, ForbiddenException, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LivekitService } from './livekit.service';

export const LESSON_MS = 40 * 60_000;
export const MEETING_MS = 45 * 60_000;

@Injectable()
export class MeetingClockService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private busy = false;
  private readonly logger = new Logger(MeetingClockService.name);
  constructor(private readonly prisma: PrismaService, private readonly livekit: LivekitService) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.sweep(), 1000);
    this.timer.unref();
    void this.sweep();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  async sweep() {
    if (this.busy) return;
    this.busy = true;
    try {
      const due = await this.prisma.session.findMany({ where: {
        status: { in: [SessionStatus.SCHEDULED, SessionStatus.IN_PROGRESS] },
        meetingStartedAt: { lte: new Date(Date.now() - MEETING_MS) },
      }, select: { id: true } });
      for (const session of due) {
        try { await this.finishExpired(session.id); }
        catch (error) { this.logger.warn(`Room shutdown will retry for ${session.id}: ${error instanceof Error ? error.message : 'Unknown error'}`); }
      }
    } catch (error) { this.logger.warn(`Meeting expiry check failed: ${error instanceof Error ? error.message : 'Unknown error'}`); }
    finally { this.busy = false; }
  }

  async finishExpired(sessionId: string) {
    return this.prisma.$transaction(async tx => {
      const session = await tx.session.findUnique({ where: { id: sessionId } });
      if (!session) return;
      for (const key of [`lecturer:${session.lecturerId}`, `student:${session.studentId}`].sort()) await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))::text`;
      const current = await tx.session.findUniqueOrThrow({ where: { id: sessionId } });
      if (!current.meetingStartedAt || Date.now() < +current.meetingStartedAt + MEETING_MS || ![SessionStatus.SCHEDULED, SessionStatus.IN_PROGRESS].includes(current.status as 'SCHEDULED' | 'IN_PROGRESS')) return;
      // Delete the room before completion so a failed shutdown remains eligible for retry.
      await this.livekit.endRoom(current.livekitRoomName || this.livekit.getRoomName(sessionId));
      await tx.session.updateMany({ where: { id: sessionId, meetingStartedAt: current.meetingStartedAt, status: current.status }, data: { status: SessionStatus.COMPLETED } });
    }, { maxWait: 10_000, timeout: 15_000 });
  }

  async snapshot(user: { id: string; role: string }, sessionId: string) {
    let session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new BadRequestException('Session not found');
    if (user.id !== session.studentId && user.id !== session.lecturerId && !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) throw new ForbiddenException('You are not a participant of this session');
    const expired = !!session.meetingStartedAt && Date.now() >= +session.meetingStartedAt + MEETING_MS;
    if (expired) {
      try { await this.finishExpired(sessionId); } catch (error) { this.logger.warn(`Room shutdown will retry for ${sessionId}`); }
      session = await this.prisma.session.findUniqueOrThrow({ where: { id: sessionId } });
    }
    return {
      serverNow: new Date(), meetingStartedAt: session.meetingStartedAt,
      warningAt: session.meetingStartedAt ? new Date(+session.meetingStartedAt + LESSON_MS) : null,
      meetingEndsAt: session.meetingStartedAt ? new Date(+session.meetingStartedAt + MEETING_MS) : null,
      status: session.status, expired,
    };
  }

  async start(user: { id: string; role: string }, sessionId: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new BadRequestException('Session not found');
    if (user.id !== session.lecturerId && !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) throw new ForbiddenException('Only the assigned lecturer can start the lesson');
    if (![SessionStatus.SCHEDULED, SessionStatus.IN_PROGRESS].includes(session.status as 'SCHEDULED' | 'IN_PROGRESS')) throw new BadRequestException('This session is not active');
    await this.prisma.session.updateMany({ where: { id: sessionId, meetingStartedAt: null, status: { in: [SessionStatus.SCHEDULED, SessionStatus.IN_PROGRESS] } }, data: { meetingStartedAt: new Date(), status: SessionStatus.IN_PROGRESS } });
    return this.snapshot(user, sessionId);
  }
}
