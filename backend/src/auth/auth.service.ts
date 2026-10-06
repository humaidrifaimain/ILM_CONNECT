import { BadRequestException, ServiceUnavailableException, ConflictException, Injectable, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { Resend } from 'resend';
import * as bcrypt from 'bcrypt';
import { LoginDto, RegisterDto, WaitlistDto } from './dto/auth.dto';
import { Role, UserStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async joinWaitlist(dto: WaitlistDto) {
    await this.prisma.waitlistEntry.createMany({ data: [{ fullName: dto.fullName.trim(), email: dto.email.trim().toLowerCase(), phone: dto.phone, country: dto.country, course: dto.course, pace: dto.pace, notes: dto.notes }], skipDuplicates: true });
    return { message: 'Your interest has been registered. Our team will contact you when a suitable schedule is available.' };
  }

  async requestPasswordReset(email: string) {
    if (!process.env.RESEND_API_KEY) throw new ServiceUnavailableException('Password reset email is not configured. Please contact support.');
    const message = 'If an active account matches this email, a password reset link will arrive shortly.';
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user || user.status !== UserStatus.ACTIVE || user.deletedAt) return { message };
    const recent = await this.prisma.passwordReset.findFirst({ where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 60000) } } });
    if (recent) return { message };
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const reset = await this.prisma.passwordReset.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 60000) } });
    const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`;
    try {
      const result = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: process.env.RESEND_FROM_EMAIL || 'IlmConnect <onboarding@resend.dev>', to: user.email, subject: 'Reset your IlmConnect password', text: `Reset your password: ${url}\nThis link expires in 30 minutes. If you did not request this, ignore this email.` });
      if (result.error) throw new Error('Delivery failed');
    } catch {
      await this.prisma.passwordReset.delete({ where: { id: reset.id } });
      throw new ServiceUnavailableException('Unable to send password recovery email. Please contact support.');
    }
    return { message };
  }

  async resetPassword(token: string, password: string) {
    if (!/^[a-f0-9]{64}$/.test(token)) throw new BadRequestException('Invalid or expired reset link');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const reset = await this.prisma.passwordReset.findUnique({ where: { tokenHash }, include: { user: true } });
    if (!reset || reset.expiresAt <= new Date() || reset.user.status !== UserStatus.ACTIVE || reset.user.deletedAt) throw new BadRequestException('Invalid or expired reset link');
    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.$transaction(async tx => {
      const consumed = await tx.passwordReset.deleteMany({ where: { id: reset.id, expiresAt: { gt: new Date() } } });
      if (consumed.count !== 1) throw new BadRequestException('Invalid or expired reset link');
      await tx.user.update({ where: { id: reset.userId }, data: { passwordHash, tokenVersion: { increment: 1 } } });
      await tx.passwordReset.deleteMany({ where: { userId: reset.userId } });
      await tx.auditLog.create({ data: { actorId: reset.userId, action: 'PASSWORD_RESET', entity: 'USER', entityId: reset.userId, details: {} } });
    });
    return { message: 'Password updated. Sign in with your new password.' };
  }

  async register(dto: RegisterDto) {
    try {
      for (const field of ['fullName', 'phone', 'country', 'timezone'] as const) {
        if (typeof dto[field] !== 'string' || !dto[field].trim()) throw new BadRequestException(`Provide a valid ${field}`);
        dto[field] = dto[field].trim();
      }
      try { new Intl.DateTimeFormat('en', { timeZone: dto.timezone }); }
      catch { throw new BadRequestException('Choose a valid timezone, such as Asia/Colombo'); }
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase() },
      });

      if (existingUser) {
        throw new ConflictException('Email already registered');
      }

      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(dto.password, saltRounds);

      const role = dto.role || Role.STUDENT;
      if (role !== Role.STUDENT && role !== Role.LECTURER) throw new BadRequestException('Only student and lecturer accounts can register');
      const status = role === Role.LECTURER ? UserStatus.PENDING : UserStatus.ACTIVE;

      const user = await this.prisma.$transaction(async tx => {
        const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          role,
          status,
          emailVerifiedAt: role === Role.STUDENT ? new Date() : null, // Auto-verify student for local setup
        },
      });

      if (role === Role.LECTURER) {
        await tx.lecturerProfile.create({
          data: {
            userId: user.id,
            fullName: dto.fullName,
            bio: dto.bio || 'New lecturer onboarding',
            qualifications: dto.qualifications || 'Pending evaluation',
            specializations: dto.specializations || ['Quran Recitation'],
            languages: dto.languages || ['English'],
            hourlyAvailabilityJson: [],
            payoutMethod: dto.payoutMethod || 'wise',
            payoutDetails: dto.payoutDetails || '',
            status: UserStatus.PENDING,
          },
        });
      } else {
        await tx.studentProfile.create({
          data: {
            userId: user.id,
            fullName: dto.fullName,
            phone: dto.phone,
            country: dto.country,
            timezone: dto.timezone,
            preferredLanguage: dto.preferredLanguage || 'English',
            learningGoals: dto.learningGoals || 'Quran Recitation and Tajweed',
          },
        });
      }

      // Write audit log
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'USER_REGISTER',
          entity: 'USER',
          entityId: user.id,
          details: {},
        },
      });

        return user;
      });

      return this.sanitizeUser(user);
    } catch (e: any) {
      if (e instanceof ConflictException || e instanceof BadRequestException) throw e;
      throw new InternalServerErrorException(e.message || String(e));
    }
  }

  async login(dto: LoginDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase() },
        include: {
          studentProfile: true,
          lecturerProfile: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      if (user.deletedAt || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Account suspended. Please contact administrator.');
      }

      const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
      if (!passwordMatches) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Log active login in audit
      await this.prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: 'USER_LOGIN',
          entity: 'USER',
          entityId: user.id,
          details: {},
        },
      });

      const token = this.generateJwtToken(user.id, user.email, user.role, user.tokenVersion);

      return {
        user: this.sanitizeUser(user),
        token,
      };
    } catch (err: any) {
      console.error('CRITICAL AUTH LOGIN ERROR:', err);
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new InternalServerErrorException(err.message || 'Login failed');
    }
  }

  generateJwtToken(userId: string, email: string, role: Role, version = 0) {
    const payload = { email, sub: userId, role, version };
    return this.jwtService.sign(payload);
  }

  async logout(userId: string) {
    await this.prisma.$transaction(async tx => {
      await tx.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
      await tx.auditLog.create({ data: { actorId: userId, action: 'USER_LOGOUT', entity: 'USER', entityId: userId, details: {} } });
    });
  }

  sanitizeUser(user: any) {
    const { passwordHash, twoFactorSecret, ...sanitized } = user;
    return sanitized;
  }
}
