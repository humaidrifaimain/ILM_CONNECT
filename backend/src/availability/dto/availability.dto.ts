import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSlotDto {
  @IsDateString()
  @IsNotEmpty()
  startsAt: string;

  @IsDateString()
  @IsNotEmpty()
  endsAt: string;

  @IsString()
  @IsOptional()
  recurringRule?: string;

  @IsString()
  @IsOptional()
  lecturerId?: string;
}
