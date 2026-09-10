import { IsEmail, IsNotEmpty, IsOptional, IsString, IsArray, IsNumber } from 'class-validator';

export class CreateLecturerDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsOptional()
  specializations?: string[] | string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  qualifications?: string;

  @IsArray()
  @IsOptional()
  languages?: string[];

  @IsNumber()
  @IsOptional()
  hourlyRate?: number;

  @IsArray()
  @IsOptional()
  hourlyAvailabilityJson?: number[];

  @IsOptional()
  sendInvitationEmail?: boolean;
}

export class AssignLecturerDto {
  @IsString()
  @IsNotEmpty()
  lecturerId: string;
}
