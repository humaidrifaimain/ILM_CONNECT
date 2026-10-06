import { Controller, Get, Post, Query, Param, UseGuards, Req, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { LivekitService } from './livekit.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SessionStatus } from '@prisma/client';

@Controller('livekit')
@UseGuards(JwtAuthGuard)
export class LivekitController {
  private readonly logger = new Logger(LivekitController.name);

  constructor(
    private readonly livekitService: LivekitService,
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  private validateJoinWindow(session: { startsAt: Date }) {
    const now = Date.now();
    if (now < +session.startsAt - 30 * 60000) throw new BadRequestException('The classroom opens 30 minutes before the session starts');
    if (now > +session.startsAt + 2 * 60 * 60000) throw new BadRequestException('The join window for this session has expired');
  }

  /**
   * POST /livekit/reopen/:sessionId
   * Reopens a canceled or no-show session to SCHEDULED or IN_PROGRESS state.
   */
  @Post('reopen/:sessionId')
  async reopenSession(@Req() req: any, @Param('sessionId') sessionId: string) {
    const userId = req.user.id;
    const userRole = req.user.role;

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { student: true, lecturer: true },
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    const isStudent = session.studentId === userId;
    const isLecturer = session.lecturerId === userId;
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

    if (!isLecturer && !isAdmin) {
      throw new ForbiddenException('You are not authorized to reopen this session');
    }
    this.validateJoinWindow(session);
    if (![SessionStatus.CANCELED, SessionStatus.NO_SHOW_STUDENT].includes(session.status as any)) throw new BadRequestException('Only canceled sessions or student absences can be reopened');

    const now = new Date();
    const startsAt = new Date(session.startsAt);
    const newStatus = now >= startsAt ? SessionStatus.IN_PROGRESS : SessionStatus.SCHEDULED;

    const updatedSession = await this.prisma.$transaction(async tx => {
    for (const key of [`lecturer:${session.lecturerId}`, `student:${session.studentId}`].sort()) await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))::text`;
    const overlap = await tx.session.findFirst({ where: { id: { not: sessionId }, status: { in: [SessionStatus.SCHEDULED, SessionStatus.IN_PROGRESS] }, startsAt: { lt: session.endsAt }, endsAt: { gt: session.startsAt }, OR: [{ lecturerId: session.lecturerId }, { studentId: session.studentId }] } });
    if (overlap) throw new BadRequestException('Another session occupies this time');
    const changed = await tx.session.updateMany({ where: { id: sessionId, status: session.status }, data: { status: newStatus } });
    if (changed.count !== 1) throw new BadRequestException('The session status has changed. Refresh and try again');
    await tx.availabilitySlot.updateMany({ where: { lecturerId: session.lecturerId, startsAt: { lte: session.startsAt }, endsAt: { gte: session.endsAt } }, data: { status: 'BOOKED' } });
    return tx.session.findUniqueOrThrow({
      where: { id: sessionId },
      include: { student: true, lecturer: true },
    });
    });

    return {
      success: true,
      message: 'Session reopened successfully',
      session: {
        id: updatedSession.id,
        startsAt: updatedSession.startsAt,
        endsAt: updatedSession.endsAt,
        status: updatedSession.status,
        studentName: updatedSession.student?.fullName || 'Student',
        lecturerName: updatedSession.lecturer?.fullName || 'Instructor',
      },
    };
  }

  /**
   * GET /livekit/token/:sessionId
   * Returns a LiveKit access token for the requesting user to join the session room.
   */
  @Get('token/:sessionId')
  async getToken(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
    @Query('reopen') reopen?: string,
  ) {
    const userId = req.user.id;
    const userRole = req.user.role;

    // 1. Find the session
    let session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        student: true,
        lecturer: true,
      },
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    // 2. Verify the user is a participant of this session
    const isStudent = session.studentId === userId;
    const isLecturer = session.lecturerId === userId;
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

    if (!isStudent && !isLecturer && !isAdmin) {
      throw new ForbiddenException('You are not a participant of this session');
    }

    const now = new Date();
    const startsAt = new Date(session.startsAt);
    this.validateJoinWindow(session);
    if ([SessionStatus.COMPLETED, SessionStatus.NO_SHOW_LECTURER].includes(session.status as any)) throw new BadRequestException('This session has concluded');
    if (isStudent) {
      const subscription = await this.prisma.subscription.findFirst({ where: {
        studentId: userId, status: 'ACTIVE', currentPeriodStart: { lte: now }, currentPeriodEnd: { gt: now },
      } });
      if (!subscription) throw new ForbiddenException('An active subscription is required to join a class');
    }

    // 3. Verify the session is in a joinable state or reopen if requested
    if (session.status === SessionStatus.CANCELED || session.status === SessionStatus.NO_SHOW_STUDENT) {
      if (reopen === 'true') {
        await this.reopenSession(req, sessionId);
        session = await this.prisma.session.findUniqueOrThrow({ where: { id: sessionId }, include: { student: true, lecturer: true } });
      } else {
        throw new BadRequestException({
          message: 'This session has been canceled',
          isCanceled: true,
          sessionId: session.id,
          session: {
            id: session.id,
            startsAt: session.startsAt,
            endsAt: session.endsAt,
            status: session.status,
            studentName: session.student?.fullName || 'Student',
            lecturerName: session.lecturer?.fullName || 'Instructor',
          },
        });
      }
    }

    if (session.status === SessionStatus.SCHEDULED && now >= startsAt) {
      await this.prisma.session.updateMany({
        where: { id: sessionId, status: SessionStatus.SCHEDULED },
        data: { status: SessionStatus.IN_PROGRESS },
      });
      session = await this.prisma.session.findUniqueOrThrow({ where: { id: sessionId }, include: { student: true, lecturer: true } });
      if (session.status !== SessionStatus.IN_PROGRESS) throw new BadRequestException('This session is no longer active');
    }

    // 6. Ensure LiveKit room name is assigned and persisted
    const roomName = session.livekitRoomName || this.livekitService.getRoomName(sessionId);
    if (!session.livekitRoomName) {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { livekitRoomName: roomName },
      });
    }

    const participantName = isStudent ? session.student.fullName : session.lecturer.fullName;
    const identity = `${isStudent ? 'student' : 'lecturer'}:${userId}`;

    const tokenResult = await this.livekitService.generateToken(identity, participantName, roomName);
    const { token, wsUrl, isSimulation, warning } = tokenResult;

    // If lecturer is joining, notify the student via real-time in-app notification & SSE
    if (isLecturer && session.studentId) {
      try {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const recentNotif = await this.prisma.notification.findFirst({
          where: {
            userId: session.studentId,
            type: 'LECTURER_JOINED',
            createdAt: { gte: tenMinutesAgo },
          },
        });

        if (!recentNotif) {
          const lecturerName = session.lecturer?.fullName || 'Your Instructor';
          await this.notificationService.createNotification(
            session.studentId,
            'LECTURER_JOINED',
            {
              sessionId: session.id,
              title: `${lecturerName} Joined Classroom`,
              message: `${lecturerName} has entered the session room. Click Join Classroom to enter your lesson!`,
              actorName: lecturerName,
              actorRole: 'LECTURER',
              actionUrl: `/student/sessions/${session.id}/room`,
            },
            'IN_APP',
          );
          this.logger.log(`Dispatched LECTURER_JOINED notification to student ${session.studentId} for session ${session.id}`);
        }
      } catch (err: any) {
        this.logger.warn(`Failed to dispatch LECTURER_JOINED notification: ${err.message}`);
      }
    }

    return {
      token,
      wsUrl,
      roomName,
      isSimulation: !!isSimulation,
      warning,
      session: {
        id: session.id,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        status: session.status,
        studentName: session.student.fullName,
        lecturerName: session.lecturer.fullName,
      },
    };
  }
}
