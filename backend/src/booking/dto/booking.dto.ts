import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @IsOptional()
  lecturerId?: string;

  @IsString()
  @IsOptional()
  studentId?: string;

  @IsDateString()
  @IsNotEmpty()
  startsAt: string;
}
