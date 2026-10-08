import { Transform } from 'class-transformer';
import { ArrayMinSize, ArrayMaxSize, ArrayUnique, IsEmail, IsNotEmpty, IsOptional, IsString, IsArray, IsNumber, IsInt, Min, Max, Length, ValidateIf, IsEnum, IsDefined } from 'class-validator';
import { UserStatus } from '@prisma/client';

export class UpdateLecturerDto {
  @IsDefined()
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(24)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(23, { each: true })
  hourlyAvailabilityJson: number[];
}

export class UpdateUserStatusDto {
  @IsDefined()
  @IsEnum(UserStatus)
  status: UserStatus;
}

export class CreateLecturerDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(1, 160)
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @Length(8, 128)
  password: string;

  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) => typeof value === 'string' ? value.split(',').map(item => item.trim()).filter(Boolean) : value)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Length(1, 100, { each: true })
  specializations?: string[];

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  qualifications?: string;

  @IsArray()
  @ValidateIf((_, value) => value !== undefined)
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Length(1, 100, { each: true })
  languages?: string[];

  @IsNumber()
  @IsOptional()
  @Min(0)
  hourlyRate?: number;

  @IsArray()
  @ValidateIf((_, value) => value !== undefined)
  @ArrayMinSize(4)
  @ArrayMaxSize(24)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(23, { each: true })
  hourlyAvailabilityJson?: number[];

  @IsOptional()
  sendInvitationEmail?: boolean;
}

export class AssignLecturerDto {
  @IsString()
  @IsNotEmpty()
  lecturerId: string;
}
