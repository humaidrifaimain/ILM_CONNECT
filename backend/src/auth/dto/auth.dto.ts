import { IsEmail, IsIn, Length, MaxLength, IsNotEmpty, IsOptional, IsString, MinLength, IsDateString, Matches } from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @IsIn([Role.STUDENT, Role.LECTURER])
  @IsOptional()
  role?: Role;

  // Profile data
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsOptional()
  @IsIn(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'])
  gender?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  dateOfBirth?: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  timezone: string;

  // Student specific
  @IsString()
  @IsOptional()
  preferredLanguage?: string;

  @IsString()
  @IsOptional()
  learningGoals?: string;

  @IsOptional()
  preferredHours?: number[];

  @IsString()
  @IsOptional()
  currentTier?: string;

  // Lecturer specific
  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  qualifications?: string;

  @IsOptional()
  specializations?: any; // parsed as JSON / Array

  @IsOptional()
  languages?: any; // parsed as JSON / Array

  @IsString()
  @IsOptional()
  payoutMethod?: string;

  @IsString()
  @IsOptional()
  payoutDetails?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}
export class ResetPasswordDto {
  @IsString()
  @Length(64, 64)
  token: string;
  @IsString()
  @Length(8, 128)
  password: string;
}

export class WaitlistDto {
  @IsString() @Length(1, 200) fullName: string;
  @IsEmail() @MaxLength(254) email: string;
  @IsString() @MaxLength(30) phone: string;
  @IsString() @Length(1, 100) country: string;
  @IsIn(['Noorani Qaida', 'Tajweed Quran Recitation', 'Hifz Memorization']) course: string;
  @IsIn(['standard', 'fast-track']) pace: string;
  @IsString() @MaxLength(2000) notes: string;
}
