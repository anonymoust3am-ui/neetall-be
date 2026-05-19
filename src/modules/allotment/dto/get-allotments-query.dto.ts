import { IsOptional, IsInt, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class GetAllotmentsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page_size?: number;

  @IsOptional()
  @Type(() => Number)
  session?: number;

  @IsOptional()
  @IsString()
  counselling_level?: string;

  @IsOptional()
  @IsString()
  rounds?: string;

  @IsOptional()
  @IsString()
  institutes?: string;

  @IsOptional()
  @IsString()
  courses?: string;

  @IsOptional()
  @IsString()
  quotas?: string;

  @IsOptional()
  @IsString()
  categories?: string;

  @IsOptional()
  @IsString()
  states?: string;
}
