import { IsIn, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCourseRequestDto {
  @IsUUID()
  learningPathId: string;
}

export class ReviewCourseRequestDto {
  @IsString()
  @MaxLength(8)
  @IsIn(['ACCEPTED', 'DECLINED'])
  status: 'ACCEPTED' | 'DECLINED';
}
