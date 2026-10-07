import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsString, Max, MaxLength, Min, MinLength, ValidateNested, Matches } from 'class-validator';

export class McqQuestionDto {
  @IsString()
  @Matches(/\S/)
  @MaxLength(2000)
  prompt: string;

  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @Matches(/\S/, { each: true })
  @MaxLength(500, { each: true })
  options: string[];

  @IsInt()
  @Min(0)
  @Max(3)
  correctOption: number;
}

export class CreateCourseAssessmentDto {
  @IsString()
  @MinLength(1)
  @Matches(/\S/)
  @MaxLength(160)
  title: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => McqQuestionDto)
  questions: McqQuestionDto[];
}
