import { Controller, Get, Post, Query, Param, UseGuards, Req, BadRequestException, ForbiddenException } from '@nestjs/common';
import { LivekitService } from './livekit.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SessionStatus } from '@prisma/client';

@Controller('livekit')
@UseGuards(JwtAuthGuard)
export class LivekitController {
  constructor(
    private readonly livekitService: LivekitService,
    private readonly prisma: PrismaService,
  ) {}

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

    if (!isStudent && !isLecturer && !isAdmin) {
      throw new ForbiddenException('You are not authorized to reopen this session');
    }

    const now = new Date();
    const startsAt = new Date(session.startsAt);
    const newStatus = now >= startsAt ? SessionStatus.IN_PROGRESS : SessionStatus.SCHEDULED;

    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: { status: newStatus },
      include: { student: true, lecturer: true },
    });

    try {
      await this.prisma.availabilitySlot.updateMany({
        where: {
          lecturerId: session.lecturerId,
          startsAt: session.startsAt,
        },
        data: { status: 'BOOKED' },
      });
    } catch (e) {
      // Non-critical if slot doesn't exist
    }

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

    // 3. Verify the session is in a joinable state or reopen if requested
    if (session.status === SessionStatus.CANCELED || session.status === SessionStatus.NO_SHOW_STUDENT) {
      if (reopen === 'true') {
        const newStatus = now >= startsAt ? SessionStatus.IN_PROGRESS : SessionStatus.SCHEDULED;
        session = await this.prisma.session.update({
          where: { id: sessionId },
          data: { status: newStatus },
          include: { student: true, lecturer: true },
        });
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

    // 4. Check join window: 30 min before start to 2 hours after start
    const joinWindowStart = new Date(startsAt.getTime() - 30 * 60 * 1000); // 30 min before
    const joinWindowEnd = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000); // 2 hours after start

    // if (now < joinWindowStart) {
    //   const minutesUntil = Math.ceil((joinWindowStart.getTime() - now.getTime()) / 60000);
    //   throw new BadRequestException(`Session room opens ${minutesUntil} minutes before the start time. Please come back later.`);
    // }

    // if (now > joinWindowEnd) {
    //   throw new BadRequestException('The join window for this session has expired');
    // }

    // 5. Update session status to IN_PROGRESS if it's still SCHEDULED and within start time
    if (session.status === SessionStatus.SCHEDULED && now >= startsAt) {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { status: SessionStatus.IN_PROGRESS },
      });
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
