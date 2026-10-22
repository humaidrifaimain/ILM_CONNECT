import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Role, Session } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BookingService } from '../booking/booking.service';
import { LivekitService } from './livekit.service';

export const STUDENT_WAIT_MS = 15 * 60_000;
export const STUDENT_REMINDER_MS = 5 * 60_000;
const HEARTBEAT_MS = 20_000;
const active = (session: Session) => ['SCHEDULED', 'IN_PROGRESS'].includes(session.status);
type Caller = { id: string; role: string };

@Injectable()
export class StudentAttendanceService {
  constructor(private readonly prisma: PrismaService, private readonly livekit: LivekitService, private readonly bookings: BookingService) {}

  private async sessionFor(user: Caller, id: string, lecturerOnly = false) {
    const session = await this.prisma.session.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');
    const admin = ['ADMIN', 'SUPER_ADMIN'].includes(user.role);
    if (!admin && user.id !== session.lecturerId && (lecturerOnly || user.id !== session.studentId)) throw new ForbiddenException('You are not authorized to check this session attendance');
    return session;
  }

  private promptAt(session: Session) {
    if (!session.meetingStartedAt) return null;
    const initial = Math.max(+session.startsAt, +session.meetingStartedAt) + STUDENT_WAIT_MS;
    return new Date(Math.max(initial, session.attendancePromptAfter ? +session.attendancePromptAfter : 0));
  }

  async recordConnection(sessionId: string, studentId: string, joined: boolean, at = new Date()) {
    return this.prisma.$transaction(async tx => {
      const original = await tx.session.findUnique({ where: { id: sessionId } });
      if (!original || original.studentId !== studentId) return;
      for (const key of [`lecturer:${original.lecturerId}`, `student:${original.studentId}`].sort()) await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))::text`;
      const session = await tx.session.findUniqueOrThrow({ where: { id: sessionId } });
      if (!active(session) || (session.attendanceResetAt && +at < Math.floor(+session.attendanceResetAt / 1000) * 1000)) return;
      if (joined) {
        await tx.session.update({ where: { id: sessionId }, data: {
          studentJoinedAt: !session.studentJoinedAt || at < session.studentJoinedAt ? at : session.studentJoinedAt,
          studentLastSeenAt: !session.studentLastSeenAt || at > session.studentLastSeenAt ? at : session.studentLastSeenAt,
          studentLeftAt: !session.studentLeftAt || at >= session.studentLeftAt ? null : session.studentLeftAt,
          attendancePromptAfter: null,
        } });
      } else if (session.studentJoinedAt && (!session.studentLastSeenAt || at >= session.studentLastSeenAt) && (!session.studentLeftAt || at > session.studentLeftAt)) {
        await tx.session.update({ where: { id: sessionId }, data: { studentLeftAt: at } });
      }
    });
  }

  async snapshot(user: Caller, id: string) {
    let session = await this.sessionFor(user, id);
    let present: boolean | null = false;
    let detectionAvailable = true;
    if (active(session)) {
      if (this.livekit.isConfigured()) {
        try {
          present = await this.livekit.studentIsPresent(session.livekitRoomName || this.livekit.getRoomName(id), session.studentId);
          if (present || (session.studentJoinedAt && !session.studentLeftAt)) await this.recordConnection(id, session.studentId, present);
          session = await this.prisma.session.findUniqueOrThrow({ where: { id } });
        } catch { present = null; detectionAvailable = false; }
      } else if (process.env.NODE_ENV === 'production') {
        present = null; detectionAvailable = false;
      } else {
        present = !!session.studentLastSeenAt && !session.studentLeftAt && Date.now() - +session.studentLastSeenAt < HEARTBEAT_MS;
      }
    }
    const promptAt = this.promptAt(session);
    return {
      serverNow: new Date(), status: session.status, studentJoinedAt: session.studentJoinedAt,
      studentPresent: present, detectionAvailable, promptAt,
      shouldPrompt: detectionAvailable && active(session) && !session.studentJoinedAt && !!promptAt && Date.now() >= +promptAt,
    };
  }

  async heartbeat(user: Caller, id: string) {
    const session = await this.sessionFor(user, id);
    if (user.role !== 'STUDENT' || user.id !== session.studentId) throw new ForbiddenException('Only the assigned student can report a classroom connection');
    if (!active(session)) throw new BadRequestException('This session is no longer active');
    if (this.livekit.isConfigured()) {
      if (!await this.livekit.studentIsPresent(session.livekitRoomName || this.livekit.getRoomName(id), session.studentId)) throw new BadRequestException('Student has not connected to the classroom');
    } else if (process.env.NODE_ENV === 'production') throw new ServiceUnavailableException('Live attendance is unavailable');
    await this.recordConnection(id, session.studentId, true);
    return this.snapshot(user, id);
  }

  async wait(user: Caller, id: string) {
    await this.sessionFor(user, id, true);
    const attendance = await this.snapshot(user, id);
    if (!attendance.shouldPrompt) throw new BadRequestException('This student is not awaiting an absence decision');
    const result = await this.prisma.session.updateMany({ where: { id, studentJoinedAt: null, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } }, data: { attendancePromptAfter: new Date(Date.now() + STUDENT_REMINDER_MS) } });
    if (result.count !== 1) throw new BadRequestException('Student attendance changed. Refresh and try again.');
    return this.snapshot(user, id);
  }

  async markAbsent(user: Caller, id: string) {
    const session = await this.sessionFor(user, id, true);
    const attendance = await this.snapshot(user, id);
    if (!attendance.shouldPrompt) throw new BadRequestException('This student is not awaiting an absence decision');
    return this.bookings.markStudentAbsent({ ...user, role: user.role as Role }, id,
      'Student did not join the classroom after at least 15 minutes.', 'student', {
        onlyIfNeverJoined: true,
        closeMeeting: async () => {
          const room = session.livekitRoomName || this.livekit.getRoomName(id);
          if (this.livekit.isConfigured() && await this.livekit.studentIsPresent(room, session.studentId)) throw new BadRequestException('The student has joined. Refresh attendance and continue the lesson.');
          await this.livekit.endRoom(room);
        },
      });
  }

  async webhook(event: { event: string; room?: { name: string }; participant?: { identity: string }; createdAt?: bigint }) {
    if (!['participant_joined', 'participant_left'].includes(event.event) || !event.room || !event.participant?.identity.startsWith('student:')) return;
    const studentId = event.participant.identity.slice('student:'.length);
    const session = await this.prisma.session.findFirst({ where: { livekitRoomName: event.room.name, studentId } });
    if (!session) return;
    const at = event.createdAt ? new Date(Number(event.createdAt) * 1000) : new Date();
    await this.recordConnection(session.id, studentId, event.event === 'participant_joined', at);
  }
}
