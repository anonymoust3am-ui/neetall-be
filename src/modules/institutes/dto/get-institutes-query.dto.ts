import { IsOptional, IsInt, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetInstitutesQueryDto {
  @IsOptional()
  @IsString()
  states?: string;

  @IsOptional()
  @IsString()
  institute_type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  university_id?: number;

  @IsOptional()
  @IsString()
  counselling?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;
}
