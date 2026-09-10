import { ConflictException, Injectable, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { Role, UserStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase() },
      });

      if (existingUser) {
        throw new ConflictException('Email already registered');
      }

      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(dto.password, saltRounds);

      const role = dto.role || Role.STUDENT;
      const status = role === Role.LECTURER ? UserStatus.PENDING : UserStatus.ACTIVE;

      const user = await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          role,
          status,
          emailVerifiedAt: role === Role.STUDENT ? new Date() : null, // Auto-verify student for local setup
        },
      });

      if (role === Role.LECTURER) {
        await this.prisma.lecturerProfile.create({
          data: {
            userId: user.id,
            fullName: dto.fullName,
            bio: dto.bio || 'New lecturer onboarding',
            qualifications: dto.qualifications || 'Pending evaluation',
            specializations: dto.specializations || ['Quran Recitation'],
            languages: dto.languages || ['English'],
            hourlyAvailabilityJson: {
              monday: ['09:00-12:00', '14:00-18:00'],
              tuesday: ['09:00-12:00', '14:00-18:00'],
              wednesday: ['09:00-12:00', '14:00-18:00'],
              thursday: ['09:00-12:00', '14:00-18:00'],
              friday: ['09:00-12:00'],
              saturday: ['10:00-15:00'],
            },
            payoutMethod: dto.payoutMethod || 'wise',
            payoutDetails: dto.payoutDetails || 'wise:default@example.com',
            status: UserStatus.PENDING,
          },
        });
      } else {
        await this.prisma.studentProfile.create({
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
      await this.prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: 'USER_REGISTER',
          entity: 'USER',
          entityId: user.id,
          details: { ip: '127.0.0.1', userAgent: 'ilmconnect-client' },
        },
      });

      return this.sanitizeUser(user);
    } catch (e: any) {
      if (e instanceof ConflictException) throw e;
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

      if (user.status === UserStatus.SUSPENDED) {
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
          details: { ip: '127.0.0.1', userAgent: 'ilmconnect-client' },
        },
      });

      const token = this.generateJwtToken(user.id, user.email, user.role);

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

  generateJwtToken(userId: string, email: string, role: Role) {
    const payload = { email, sub: userId, role };
    return this.jwtService.sign(payload);
  }

  sanitizeUser(user: any) {
    const { passwordHash, twoFactorSecret, ...sanitized } = user;
    return sanitized;
  }
}
